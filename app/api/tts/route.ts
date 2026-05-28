import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tts — 서버사이드 TTS
 *
 * 우선순위:
 *   1. Naver CLOVA Voice  (NAVER_TTS_CLIENT_ID + NAVER_TTS_CLIENT_SECRET)
 *   2. Google Cloud TTS   (GOOGLE_TTS_API_KEY)
 *   3. 키 없음 → { ok: false } 반환 → 클라이언트가 브라우저 TTS로 폴백
 */
export async function POST(req: NextRequest) {
  const { text, speed = 0, voiceType = 'race' } = (await req.json()) as {
    text: string;
    speed?: number;
    voiceType?: 'race' | 'emergency';
  };

  if (!text?.trim()) {
    return NextResponse.json({ ok: false, error: '텍스트가 없습니다.' }, { status: 400 });
  }

  // 채널별 목소리 선택
  // race      → 남성 중후한 목소리 (경기 진행)
  // emergency → 여성 선명한 목소리 (긴급 공지)
  const naverSpeaker    = voiceType === 'race' ? 'nminsang' : 'nara';
  const googleVoiceName = voiceType === 'race' ? 'ko-KR-Neural2-D' : 'ko-KR-Neural2-B';

  // ── 1) Naver CLOVA Voice ────────────────────────────────────────────────────
  const naverId     = process.env.NAVER_TTS_CLIENT_ID;
  const naverSecret = process.env.NAVER_TTS_CLIENT_SECRET;

  if (naverId && naverSecret) {
    try {
      const params = new URLSearchParams({
        speaker: naverSpeaker,    // race: nminsang(남성) / emergency: nara(여성)
        volume:  '0',             // -5 ~ 5
        speed:   String(speed),   // -5 ~ 5 (음수 = 느림)
        pitch:   '0',
        format:  'mp3',
        text:    text.slice(0, 2000),
      });

      const res = await fetch(
        'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts',
        {
          method:  'POST',
          headers: {
            'X-NCP-APIGW-API-KEY-ID': naverId,
            'X-NCP-APIGW-API-KEY':    naverSecret,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );

      if (res.ok) {
        const buf    = await res.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        return NextResponse.json({ ok: true, audio: base64, format: 'mp3', engine: 'naver' });
      }

      const errText = await res.text().catch(() => '');
      console.warn('[TTS] Naver 오류:', res.status, errText);
    } catch (e) {
      console.error('[TTS] Naver 예외:', e);
    }
  }

  // ── 2) Google Cloud TTS ─────────────────────────────────────────────────────
  const googleKey = process.env.GOOGLE_TTS_API_KEY;

  if (googleKey) {
    try {
      const speakingRate = Math.max(0.5, Math.min(2.0, 1.0 + speed * 0.1));
      // 채널별 오디오 파라미터
      const isRace = voiceType === 'race';
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: text.slice(0, 5000) },
            voice: {
              languageCode: 'ko-KR',
              name: googleVoiceName,   // race: Neural2-D(남성) / emergency: Neural2-B(여성)
            },
            audioConfig: {
              audioEncoding:  'MP3',
              speakingRate:   isRace
                ? Math.max(0.5, Math.min(2.0, 1.0 + speed * 0.1))   // 경기: 안정된 속도
                : Math.max(0.5, Math.min(2.0, 1.05 + speed * 0.1)), // 긴급: 약간 빠르게
              pitch:          isRace ? 0 : 1.5,   // 경기: 자연 남성 / 긴급: 약간 높여 선명
              volumeGainDb:   isRace ? 2 : 4,     // 긴급 볼륨 더 강조
            },
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as { audioContent: string };
        return NextResponse.json({
          ok: true,
          audio:  data.audioContent,
          format: 'mp3',
          engine: 'google',
        });
      }

      const errText = await res.text().catch(() => '');
      console.warn('[TTS] Google 오류:', res.status, errText);
    } catch (e) {
      console.error('[TTS] Google 예외:', e);
    }
  }

  // ── 3) API 키 없음 → 브라우저 TTS로 폴백 ────────────────────────────────────
  return NextResponse.json({
    ok:    false,
    error: 'no_api_key',
    message: '브라우저 TTS를 사용합니다. 자연스러운 목소리를 원하시면 .env.local에 TTS API 키를 추가하세요.',
  });
}
