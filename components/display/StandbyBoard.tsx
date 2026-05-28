'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

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
    <div className="flex flex-col h-full items-center justify-center bg-black gap-10">

      {/* 로고 + 물결 애니메이션 */}
      <div className="relative flex items-center justify-center">
        {/* 바깥 물결 — 로고보다 크게 */}
        <div className="absolute w-80 h-80 rounded-full border-2 border-cyan-500/15 animate-ping [animation-duration:3s]" />
        <div className="absolute w-72 h-72 rounded-full border-2 border-cyan-500/20 animate-ping [animation-duration:3s] [animation-delay:0.8s]" />
        {/* JCPSF 로고 — 흰 원형 배경 위에 표시 */}
        <div className="w-60 h-60 rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)]">
          <Image
            src="/jcpsf-logo.png"
            alt="제주시장애인수영연맹 로고"
            width={228}
            height={228}
            className="rounded-full"
            priority
          />
        </div>
      </div>

      {/* 대회명 */}
      <div className="text-center space-y-3">
        <p className="text-3xl font-bold text-cyan-400 tracking-wider">제5회 제주시 어울림 생활체육대회</p>
        <h1 className="text-7xl font-black text-white tracking-widest">수영경기</h1>
        <p className="text-2xl text-gray-500 tracking-wide">Jeju City Para Swimming Federation</p>
      </div>

      <p className="text-2xl text-gray-500">경기 시작을 기다리는 중…</p>

      {/* 시계 */}
      <div className="bg-gray-900/80 rounded-2xl px-14 py-5 border border-gray-800">
        <span className="text-5xl font-mono font-bold text-cyan-400 tracking-widest">
          {time}
        </span>
      </div>
    </div>
  );
}
