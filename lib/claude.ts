import Anthropic from '@anthropic-ai/sdk';
import type { Heat } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** 방송 멘트 생성 */
export async function generateAnnouncement(
  heat: Heat,
  type: 'intro' | 'result',
): Promise<string> {
  const lanes = heat.lanes
    .filter((l) => !l.status) // DNS/DQ 제외
    .sort((a, b) => a.lane - b.lane);

  const prompt =
    type === 'intro'
      ? `다음 수영 경기를 시작하려고 합니다. 방송 아나운서처럼 선수를 소개하는 멘트를 한국어로 작성해 주세요. 50자 이내로 간결하게.

종목: ${heat.eventName} (${heat.category}) — ${heat.heatNo}조
선수:
${lanes.map((l) => `  ${l.lane}번 레인: ${l.name} (${l.team})`).join('\n')}`
      : `경기가 끝났습니다. 결과를 발표하는 방송 멘트를 한국어로 작성해 주세요. 70자 이내.

종목: ${heat.eventName} (${heat.category}) — ${heat.heatNo}조
순위:
${lanes
  .filter((l) => l.rank)
  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  .slice(0, 3)
  .map((l) => `  ${l.rank}위: ${l.name} (${l.team}) — ${l.record}`)
  .join('\n')}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text.trim() : '';
}
