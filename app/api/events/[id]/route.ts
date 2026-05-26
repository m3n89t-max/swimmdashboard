import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PATCH /api/events/[id] — 상태 변경 (pending|active|completed)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json()) as { status: string };
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { status: body.status },
      include: { lanes: { orderBy: { lane: 'asc' } } },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}
