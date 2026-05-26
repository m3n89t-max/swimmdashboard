'use client';

import { useState, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { emitAnnouncerPlay } from '@/lib/socket';

export default function AnnouncerPage() {
  const { currentHeat, announcerEnabled, setAnnouncerEnabled } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      setText(json.data.text);

      // 오디오 재생
      if (json.data.audio) {
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = `data:audio/mp3;base64,${json.data.audio}`;
        await audioRef.current.play();
        // 전광판으로 오디오 전송
        emitAnnouncerPlay(json.data.audio);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const playManual = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch('/api/announcer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heat: currentHeat, type: 'intro' }),
      });
      const json = await res.json();
      if (json.data?.audio) {
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = `data:audio/mp3;base64,${json.data.audio}`;
        await audioRef.current.play();
        emitAnnouncerPlay(json.data.audio);
      }
    } finally {
      setLoading(false);
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
            className={`relative w-12 h-6 rounded-full transition-colors ${
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
          disabled={!currentHeat || loading}
          className="py-6 bg-blue-800 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer"
        >
          {loading ? '생성 중…' : '🎤 경기 시작 멘트'}
        </button>
        <button
          onClick={() => generate('result')}
          disabled={!currentHeat || loading}
          className="py-6 bg-green-800 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer"
        >
          {loading ? '생성 중…' : '🏆 결과 발표 멘트'}
        </button>
      </div>

      {/* 생성된 멘트 */}
      {text && (
        <div className="bg-gray-900 rounded-2xl border border-cyan-800 p-6 space-y-4">
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">생성된 방송 멘트</h2>
          <p className="text-2xl text-white leading-relaxed">{text}</p>
          <button
            onClick={playManual}
            disabled={loading}
            className="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            🔊 다시 재생
          </button>
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
        <p>• Claude AI가 자연스러운 한국어 방송 멘트를 생성하고 TTS로 재생합니다.</p>
        <p>• ANTHROPIC_API_KEY와 GOOGLE_TTS_API_KEY가 .env.local에 설정되어 있어야 합니다.</p>
      </div>
    </div>
  );
}
