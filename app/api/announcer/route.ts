import { NextRequest, NextResponse } from 'next/server';
import { generateAnnouncement } from '@/lib/claude';
import type { Heat } from '@/types';

// TTS는 클라이언트 브라우저 Web Speech API로 처리
// 이 라우트는 Claude AI 텍스트 멘트만 생성해서 반환
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { heat: Heat; type: 'intro' | 'result' };

    const text = await generateAnnouncement(body.heat, body.type);

    return NextResponse.json({ ok: true, data: { text } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'AI 아나운서 오류' }, { status: 500 });
  }
}
