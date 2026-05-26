import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseExcel, rowsToHeats } from '@/lib/excel';

// GET /api/events — 전체 경기 목록
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: { lanes: { orderBy: { lane: 'asc' } } },
      orderBy: [{ eventNo: 'asc' }, { heatNo: 'asc' }],
    });
    return NextResponse.json({ ok: true, data: events });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}

// POST /api/events — 엑셀 업로드로 대진표 등록
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows, errors } = parseExcel(buffer);

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: errors.join('\n') }, { status: 422 });
    }

    const heats = rowsToHeats(rows);

    // 트랜잭션으로 기존 데이터 삭제 후 재등록
    await prisma.$transaction(async (tx) => {
      await tx.lane.deleteMany();
      await tx.event.deleteMany();

      for (const heat of heats) {
        await tx.event.create({
          data: {
            eventNo: heat.eventNo,
            eventName: heat.eventName,
            heatNo: heat.heatNo,
            category: heat.category,
            status: 'pending',
            lanes: {
              create: heat.lanes.map((l) => ({
                lane: l.lane,
                name: l.name,
                team: l.team,
                region: l.region ?? '',
              })),
            },
          },
        });
      }
    });

    return NextResponse.json({ ok: true, data: { count: heats.length } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/events — 전체 초기화
export async function DELETE() {
  try {
    await prisma.lane.deleteMany();
    await prisma.event.deleteMany();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}
