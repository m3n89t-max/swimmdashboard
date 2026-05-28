import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/events/[id] — 단일 경기 조회 (기록·순위 포함)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { lanes: { orderBy: { lane: 'asc' } } },
    });
    if (!event) {
      return NextResponse.json({ ok: false, error: '경기를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: event });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}

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

// DELETE /api/events/[id] — 개별 경기(조) 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.lane.deleteMany({ where: { eventId: params.id } });
    await prisma.event.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'DB 오류' }, { status: 500 });
  }
}
