'use client';

/**
 * 브라우저 내장 Web Speech API로 한국어 음성 출력
 * — API 키 불필요, 인터넷 없이도 동작 (Chrome/Edge 권장)
 */
export function speak(text: string, rate = 1.0, pitch = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('이 브라우저는 음성 합성을 지원하지 않습니다.'));
      return;
    }

    // 진행 중인 발화 취소
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 1.0;

    // 한국어 음성이 있으면 우선 선택
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find((v) => v.lang.startsWith('ko'));
    if (koVoice) utter.voice = koVoice;

    utter.onend = () => resolve();
    utter.onerror = (e) => reject(new Error(e.error));

    window.speechSynthesis.speak(utter);
  });
}

/** 음성 목록이 로드될 때까지 대기 후 speak 실행 */
export async function speakWhenReady(text: string): Promise<void> {
  if (!('speechSynthesis' in window)) return;

  // 이미 로드됐으면 바로 실행
  if (window.speechSynthesis.getVoices().length > 0) {
    return speak(text);
  }

  // 로드 이벤트 대기 (최대 2초)
  await new Promise<void>((resolve) => {
    const handler = () => { resolve(); };
    window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
    setTimeout(resolve, 2000);
  });

  return speak(text);
}
