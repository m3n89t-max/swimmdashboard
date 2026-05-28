/**
 * TTS (Text-to-Speech) 유틸리티
 *
 * ┌─────────────┬──────────────────────────────┬──────────────────────────┐
 * │  채널        │  Naver CLOVA                 │  Google TTS              │
 * ├─────────────┼──────────────────────────────┼──────────────────────────┤
 * │  race       │  nminsang (남성, 중후한)       │  ko-KR-Neural2-D (남성)  │
 * │  emergency  │  nara     (여성, 차분·선명)    │  ko-KR-Neural2-B (여성)  │
 * └─────────────┴──────────────────────────────┴──────────────────────────┘
 *
 * 두 채널은 독립적으로 재생되며 서로 간섭하지 않습니다.
 * stopSpeech()는 모든 채널을 동시에 중단합니다.
 */

// ─── 채널별 오디오 상태 ───────────────────────────────────────────────────────

let _raceAudio: HTMLAudioElement | null = null;
let _raceAbort: AbortController | null = null;

let _emergencyAudio: HTMLAudioElement | null = null;
let _emergencyAbort: AbortController | null = null;

/** 경기 채널만 중단 */
export function stopRace(): void {
  _raceAbort?.abort();
  _raceAbort = null;
  if (_raceAudio) { _raceAudio.pause(); _raceAudio.src = ''; _raceAudio = null; }
}

/** 긴급 채널만 중단 */
export function stopEmergencyAudio(): void {
  _emergencyAbort?.abort();
  _emergencyAbort = null;
  if (_emergencyAudio) { _emergencyAudio.pause(); _emergencyAudio.src = ''; _emergencyAudio = null; }
}

/** 모든 TTS 채널을 즉시 중단 (브라우저 TTS 포함) */
export function stopSpeech(): void {
  stopRace();
  stopEmergencyAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ─── 브라우저 Web Speech API (폴백) ──────────────────────────────────────────

const PREFERRED_VOICE_KEYWORDS = [
  'SunHi Online (Natural)',
  'InJoon Online (Natural)',
  'Heami Online (Natural)',
  'SunHi Online',
  'Google 한국의',
  'Google Korean',
];

function selectBestKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const korean = voices.filter((v) => v.lang.startsWith('ko'));
  if (!korean.length) return undefined;
  for (const kw of PREFERRED_VOICE_KEYWORDS) {
    const found = korean.find((v) => v.name.includes(kw));
    if (found) return found;
  }
  return korean.find((v) => !v.localService) ?? korean[0];
}

export function speakBrowser(text: string, rate = 0.95, pitch = 1.0): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utter    = new SpeechSynthesisUtterance(text);
    utter.lang     = 'ko-KR';
    utter.rate     = rate;
    utter.pitch    = pitch;
    utter.volume   = 1.0;
    const voice = selectBestKoreanVoice(window.speechSynthesis.getVoices());
    if (voice) utter.voice = voice;
    utter.onend   = () => resolve();
    utter.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') resolve();
      else reject(new Error(e.error));
    };
    window.speechSynthesis.speak(utter);
  });
}

async function speakWhenReady(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise<void>((resolve) => {
      window.speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
      setTimeout(resolve, 2000);
    });
  }
  return speakBrowser(text);
}

// ─── MP3 재생 ─────────────────────────────────────────────────────────────────

function playBase64Audio(
  base64: string,
  format: string,
  channel: 'race' | 'emergency',
): Promise<void> {
  // 같은 채널 이전 오디오 정리
  if (channel === 'race') {
    if (_raceAudio) { _raceAudio.pause(); _raceAudio.src = ''; _raceAudio = null; }
  } else {
    if (_emergencyAudio) { _emergencyAudio.pause(); _emergencyAudio.src = ''; _emergencyAudio = null; }
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/${format};base64,${base64}`);
    if (channel === 'race') _raceAudio = audio;
    else _emergencyAudio = audio;

    audio.onended = () => {
      if (channel === 'race') _raceAudio = null;
      else _emergencyAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (channel === 'race') _raceAudio = null;
      else _emergencyAudio = null;
      reject(new Error('오디오 재생 오류'));
    };
    audio.play().catch((e) => {
      if (channel === 'race') _raceAudio = null;
      else _emergencyAudio = null;
      reject(e);
    });
  });
}

// ─── 채널별 TTS 핵심 함수 ────────────────────────────────────────────────────

export type TtsEngine = 'naver' | 'google' | 'browser' | 'none';

async function speakChannel(
  text: string,
  voiceType: 'race' | 'emergency',
): Promise<TtsEngine> {
  if (typeof window === 'undefined') return 'none';

  // 같은 채널 이전 재생 중단 (다른 채널은 그대로)
  if (voiceType === 'race') stopRace();
  else stopEmergencyAudio();

  const controller = new AbortController();
  if (voiceType === 'race') _raceAbort = controller;
  else _emergencyAbort = controller;

  try {
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, voiceType }),
      signal:  controller.signal,
    });

    if (controller.signal.aborted) return 'none';
    const data = (await res.json()) as {
      ok: boolean; audio?: string; format?: string; engine?: TtsEngine;
    };
    if (controller.signal.aborted) return 'none';

    if (data.ok && data.audio) {
      if (voiceType === 'race') _raceAbort = null;
      else _emergencyAbort = null;
      await playBase64Audio(data.audio, data.format ?? 'mp3', voiceType);
      return data.engine ?? 'naver';
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return 'none';
    console.warn(`[TTS:${voiceType}] API 실패, 브라우저 TTS로 폴백:`, e);
  }

  if (controller.signal.aborted) return 'none';

  // 폴백: 브라우저 TTS
  await speakWhenReady(text);
  return 'browser';
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/** 경기 진행용 TTS — 남성 중후한 목소리 */
export function speakRace(text: string): Promise<TtsEngine> {
  return speakChannel(text, 'race');
}

/** 긴급 공지용 TTS — 여성 선명한 목소리 */
export function speakEmergency(text: string): Promise<TtsEngine> {
  return speakChannel(text, 'emergency');
}

/** 하위 호환 alias → speakRace */
export function speakNatural(text: string): Promise<TtsEngine> {
  return speakRace(text);
}

export function speak(text: string, rate = 0.95, pitch = 1.0): Promise<void> {
  return speakBrowser(text, rate, pitch);
}
