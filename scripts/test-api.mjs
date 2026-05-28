import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// .env.local 파싱
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

console.log('API KEY 앞 20자:', env.ANTHROPIC_API_KEY?.slice(0, 20) + '...');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

try {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: '테스트: 수영 대회 짧은 안내 멘트 한 문장' }],
  });
  console.log('✅ 성공:', msg.content[0].text);
} catch (e) {
  console.error('❌ 오류:', e.message);
  console.error('   상태:', e.status);
  console.error('   타입:', e.error?.type);
}
