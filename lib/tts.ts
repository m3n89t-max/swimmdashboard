'use server';

/** Google Cloud TTS로 텍스트 → base64 오디오 */
export async function synthesizeSpeech(text: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_TTS_API_KEY가 설정되지 않았습니다.');
    return null;
  }

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0 },
      }),
    },
  );

  if (!res.ok) {
    console.error('TTS API 오류:', await res.text());
    return null;
  }

  const json = (await res.json()) as { audioContent: string };
  return json.audioContent; // base64 MP3
}
