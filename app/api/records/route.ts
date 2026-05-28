import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/records — 기록 입력 (레인별)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      lane: number;
      record?: string;
      rank?: number;
      status?: 'DNS' | 'DQ' | 'DSQ';
    };

    const updated = await prisma.lane.update({
      where: { eventId_lane: { eventId: body.eventId, lane: body.lane } },
      data: {
        record: body.record ?? null,
        rank: body.rank ?? null,
        status: body.status ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}

// PUT /api/records — 전체 결과 일괄 저장 후 순위 자동 계산
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      lanes: Array<{ lane: number; record?: string; status?: 'DNS' | 'DQ' | 'DSQ' }>;
    };

    // 유효 기록만 순위 계산
    /** mm:ss.hh / mm:ss:hh / ss.hh → ms */
    const normalizeRecord = (r: string) => {
      r = r.replace(/^(\d{1,2}:\d{2}):(\d{2})$/, '$1.$2');
      const secOnly = r.match(/^(\d{1,2})\.(\d{2})$/);
      if (secOnly) r = `0:${secOnly[1].padStart(2, '0')}.${secOnly[2]}`;
      return r;
    };
    const toMs = (r: string) => {
      const n = normalizeRecord(r);
      const [min, rest] = n.split(':');
      const [sec, hs] = (rest ?? '0.0').split('.');
      return Number(min) * 60000 + Number(sec) * 1000 + Number(hs ?? 0) * 10;
    };
    const validLanes = body.lanes
      .filter((l) => l.record && l.record !== '-' && !l.status)
      .sort((a, b) => toMs(a.record!) - toMs(b.record!));

    const rankMap = new Map<number, number>();
    validLanes.forEach((l, i) => rankMap.set(l.lane, i + 1));

    await prisma.$transaction(
      body.lanes.map((l) =>
        prisma.lane.update({
          where: { eventId_lane: { eventId: body.eventId, lane: l.lane } },
          data: {
            record: l.record ? normalizeRecord(l.record) : null,
            rank: rankMap.get(l.lane) ?? null,
            status: l.status ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}
