import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/lanes — 수기 레인 추가
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      lane: number;
      name: string;
      team: string;
      region?: string;
      notes?: string;
    };

    // 이미 해당 레인이 있으면 업데이트, 없으면 생성 (upsert)
    const lane = await prisma.lane.upsert({
      where: { eventId_lane: { eventId: body.eventId, lane: body.lane } },
      create: {
        eventId: body.eventId,
        lane: body.lane,
        name: body.name,
        team: body.team,
        region: body.region ?? '',
        notes: body.notes ?? null,
      },
      update: {
        name: body.name,
        team: body.team,
        region: body.region ?? '',
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json({ ok: true, data: lane });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: '레인 추가 오류' }, { status: 500 });
  }
}

// DELETE /api/lanes — 레인 삭제
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as { eventId: string; lane: number };
    await prisma.lane.delete({
      where: { eventId_lane: { eventId: body.eventId, lane: body.lane } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: '레인 삭제 오류' }, { status: 500 });
  }
}

// PATCH /api/lanes — 레인 정보 수정 (선수명·소속·등급·비고)
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      lane: number;
      name: string;
      team: string;
      region?: string;
      notes?: string;
    };

    const lane = await prisma.lane.update({
      where: { eventId_lane: { eventId: body.eventId, lane: body.lane } },
      data: {
        name: body.name,
        team: body.team,
        region: body.region ?? '',
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json({ ok: true, data: lane });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: '레인 수정 오류' }, { status: 500 });
  }
}
