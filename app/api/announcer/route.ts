import { NextRequest, NextResponse } from 'next/server';
import { generateAnnouncement } from '@/lib/claude';
import type { Heat } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      heat: Heat;
      type: 'intro' | 'result';
      nextHeat?: Heat;  // 결과 발표 후 다음 조 준비 안내용
    };

    const text = await generateAnnouncement(body.heat, body.type, body.nextHeat);

    return NextResponse.json({ ok: true, data: { text } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'AI 아나운서 오류' }, { status: 500 });
  }
}
