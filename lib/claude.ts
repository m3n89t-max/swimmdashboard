import Anthropic from '@anthropic-ai/sdk';
import type { Heat } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** 마크다운 기호 제거 (TTS 낭독 전처리) */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 기록(0:54.09 / 1:20.15) → 한국어 낭독 형식 (0분 제거) */
function recordToSpeech(record: string): string {
  let r = record.replace(/^(\d{1,2}:\d{2}):(\d{2})$/, '$1.$2');
  const secOnly = r.match(/^(\d{1,2})\.(\d{2})$/);
  if (secOnly) r = `0:${secOnly[1].padStart(2, '0')}.${secOnly[2]}`;

  const match = r.match(/^(\d{1,2}):(\d{2})\.(\d{2})$/);
  if (!match) return record;

  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  const hs  = parseInt(match[3], 10);

  const hsPart = hs > 0 ? ` ${hs}` : '';
  if (min === 0) return `${sec}초${hsPart}`;
  return `${min}분 ${sec}초${hsPart}`;
}

/**
 * 방송 멘트 생성
 * @param heat       현재 경기
 * @param type       'intro' | 'result'
 * @param nextHeat   결과 발표 후 다음 조 안내용 (result 타입에서만 사용)
 */
export async function generateAnnouncement(
  heat: Heat,
  type: 'intro' | 'result',
  nextHeat?: Heat,
): Promise<string> {
  const lanes = heat.lanes
    .filter((l) => !l.status)
    .sort((a, b) => a.lane - b.lane);

  const laneList = lanes
    .map((l) => `${l.lane}번 레인 ${l.team} ${l.name}`)
    .join(', ');

  const ranked = lanes
    .filter((l) => l.rank)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 3)
    .map((l) => {
      const rec = l.record ? ` 기록 ${recordToSpeech(l.record)}` : '';
      return `${l.rank}위 ${l.team} ${l.name}${rec}`;
    })
    .join(', ');

  // nextHeat 선수 목록은 더 이상 사용하지 않음 (종목명만 안내)

  const systemPrompt =
    '당신은 수영 대회 전문 방송 아나운서입니다. ' +
    '경기장 분위기를 살려 자연스럽고 생동감 있는 구어체 한국어로 방송합니다. ' +
    '마크다운 기호(**, *, #, -, •)는 절대 사용하지 마세요. ' +
    '번호 매기기, 목록, 헤더 없이 이어지는 문장으로만 작성하세요.';

  let userPrompt: string;

  if (type === 'intro') {
    userPrompt = `수영 대회 경기 시작 방송 멘트를 작성해 주세요.

종목: ${heat.eventName} ${heat.heatNo}조 (제${heat.eventNo}종목)
${heat.category ? `카테고리: ${heat.category}` : ''}
출전 선수 (반드시 레인번호와 이름을 모두 포함):
${laneList || '미정'}

필수 조건:
- 각 선수의 레인 번호와 이름을 모두 언급할 것
- 경기 시작을 알리는 활기찬 구어체 멘트
- 120자 이내 한두 문장으로 자연스럽게
- 예시: "제○○종목 ○조 경기를 시작합니다. ○번 레인 ○○ 선수, ○번 레인 ○○ 선수, 힘차게 출발해 주십시오!"`;

  } else if (nextHeat) {
    // 결과 발표 + 다음 조 준비 안내 통합 (다음 조 선수명 생략, 종목만 안내)
    userPrompt = `수영 대회 경기 결과 발표와 다음 조 준비 안내를 이어서 방송해 주세요.

【현재 경기 결과】
종목: ${heat.eventName} ${heat.heatNo}조 (제${heat.eventNo}종목)
상위 결과: ${ranked || '기록 없음'}

【다음 조 준비 안내】
종목: ${nextHeat.eventName} ${nextHeat.heatNo}조 (제${nextHeat.eventNo}종목)

필수 조건:
- 현재 경기 결과(1~3위 이름·기록)를 먼저 자연스럽게 발표
- 이어서 다음 조의 종목명과 조 번호만 안내 (선수 이름·레인 번호 절대 언급 금지)
- 전체 150자 이내 두 문장으로 구어체 한국어로 작성
- 예시 흐름: "○조 결과를 발표합니다. 1위 ○○ 선수, 수고하셨습니다! 계속해서 제○○종목 ○조 출전 선수들은 출발대로 이동 준비해 주십시오."`;

  } else {
    // 다음 조 정보 없이 결과만 발표
    userPrompt = `수영 대회 경기 결과 발표 방송 멘트를 작성해 주세요.

종목: ${heat.eventName} ${heat.heatNo}조 (제${heat.eventNo}종목)
${heat.category ? `카테고리: ${heat.category}` : ''}
상위 결과: ${ranked || '기록 없음'}

결과를 자연스럽게 발표하고 선수들을 축하·격려하는 따뜻하고 생동감 있는 멘트를
120자 이내 한두 문장으로 자유롭게 작성하세요.`;
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  const raw = block.type === 'text' ? block.text.trim() : '';
  return stripMarkdown(raw);
}
