import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const key = env.GOOGLE_TTS_API_KEY;
console.log('Google TTS Key 앞 10자:', key?.slice(0, 10) + '...');

const res = await fetch(
  `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: '안녕하세요 테스트입니다' },
      voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  }
);

const data = await res.json();
if (data.audioContent) {
  console.log('✅ Google TTS 성공! 오디오 길이:', data.audioContent.length, '자');
} else {
  console.error('❌ Google TTS 오류:', JSON.stringify(data, null, 2));
}
