'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { emitAnnouncerPlay } from '@/lib/socket';
import { speakWhenReady } from '@/lib/tts';

export default function AnnouncerPage() {
  const { currentHeat, announcerEnabled, setAnnouncerEnabled } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  /** Claude AI로 멘트 생성 → 브라우저 TTS 재생 → 전광판(display)에도 텍스트 전송 */
  const generate = async (type: 'intro' | 'result') => {
    if (!currentHeat) return;
    setLoading(true);
    setError('');
    setText('');

    try {
      const res = await fetch('/api/announcer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heat: currentHeat, type }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const generated: string = json.data.text;
      setText(generated);

      // 전광판 브라우저에도 텍스트 전송 (display 페이지에서 Web Speech API로 재생)
      emitAnnouncerPlay(generated);

      // 조작부 브라우저에서도 바로 재생
      await playText(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const playText = async (t: string) => {
    setSpeaking(true);
    try {
      await speakWhenReady(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TTS 오류');
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">🎙️ AI 아나운서</h1>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-gray-400">자동 방송</span>
          <div
            onClick={() => setAnnouncerEnabled(!announcerEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
              announcerEnabled ? 'bg-cyan-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                announcerEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {/* 현재 경기 정보 */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">현재 경기</h2>
        {currentHeat ? (
          <div>
            <p className="text-2xl font-black text-cyan-400">{currentHeat.eventName}</p>
            <p className="text-gray-400">
              제{currentHeat.eventNo}종목 · {currentHeat.heatNo}조 · {currentHeat.category}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">경기 진행 탭에서 경기를 먼저 선택하세요.</p>
        )}
      </div>

      {/* 방송 버튼 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => generate('intro')}
          disabled={!currentHeat || loading || speaking}
          className="py-6 bg-blue-800 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? '생성 중…' : speaking ? '🔊 방송 중…' : '🎤 경기 시작 멘트'}
        </button>
        <button
          onClick={() => generate('result')}
          disabled={!currentHeat || loading || speaking}
          className="py-6 bg-green-800 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? '생성 중…' : speaking ? '🔊 방송 중…' : '🏆 결과 발표 멘트'}
        </button>
      </div>

      {/* 생성된 멘트 */}
      {text && (
        <div className="bg-gray-900 rounded-2xl border border-cyan-800 p-6 space-y-4">
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">생성된 방송 멘트</h2>
          <p className="text-2xl text-white leading-relaxed">{text}</p>
          <div className="flex gap-3">
            <button
              onClick={() => playText(text)}
              disabled={speaking}
              className="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-800 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {speaking ? '🔊 재생 중…' : '🔊 다시 재생'}
            </button>
            <button
              onClick={() => { emitAnnouncerPlay(text); playText(text); }}
              disabled={speaking}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              📺 전광판 재전송
            </button>
          </div>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-red-300">
          {error}
        </div>
      )}

      {/* 안내 */}
      <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-5 text-sm text-gray-500 space-y-2">
        <p>• <strong className="text-gray-300">경기 시작 멘트</strong>: 선수 소개 및 경기 안내</p>
        <p>• <strong className="text-gray-300">결과 발표 멘트</strong>: 1~3위 결과 낭독</p>
        <p>• Claude AI가 방송 멘트를 생성하고 <strong className="text-gray-300">브라우저 내장 TTS</strong>로 재생합니다.</p>
        <p>• Chrome / Edge 권장 (한국어 음성 품질이 가장 좋습니다)</p>
        <p>• 전광판(TV) 화면도 같은 텍스트를 받아 자동으로 음성 출력합니다.</p>
      </div>
    </div>
  );
}
