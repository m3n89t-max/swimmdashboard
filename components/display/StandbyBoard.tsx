'use client';

import { useEffect, useState } from 'react';

export default function StandbyBoard() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center bg-black gap-8">
      {/* 물결 애니메이션 */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-64 h-64 rounded-full border-4 border-cyan-500/20 animate-ping" />
        <div className="absolute w-48 h-48 rounded-full border-4 border-cyan-500/30 animate-ping [animation-delay:0.5s]" />
        <div className="w-32 h-32 rounded-full bg-cyan-900/40 border-2 border-cyan-500 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-cyan-400" aria-hidden="true">
            <path
              d="M3 15c.5-1 1.5-2 3-2s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 3L8 7h8l-4-4zM12 3v8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-6xl font-black text-white tracking-widest">수영대회 전광판</h1>
      <p className="text-3xl text-gray-500">경기 시작을 기다리는 중...</p>

      {/* 시계 */}
      <div className="mt-8 bg-gray-900 rounded-2xl px-12 py-4 border border-gray-800">
        <span className="text-5xl font-mono font-bold text-cyan-400 tracking-widest">
          {time}
        </span>
      </div>
    </div>
  );
}
