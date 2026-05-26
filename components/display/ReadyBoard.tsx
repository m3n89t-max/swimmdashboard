'use client';

import type { Heat } from '@/types';

interface Props {
  nextHeat: Heat;
}

export default function ReadyBoard({ nextHeat }: Props) {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-10 bg-black">
      {/* 안내 메시지 */}
      <div className="text-center">
        <p className="text-5xl font-black text-yellow-300 animate-pulse tracking-widest mb-4">
          ⚠ 출발대 이동 안내
        </p>
        <p className="text-3xl text-gray-300">아래 선수는 즉시 출발대로 이동해 주세요</p>
      </div>

      {/* 다음 종목 정보 */}
      <div className="bg-gray-900 border-2 border-yellow-400 rounded-3xl px-16 py-8 w-full max-w-4xl">
        <p className="text-3xl text-yellow-300 font-bold text-center mb-2">
          제{nextHeat.eventNo}종목 · {nextHeat.heatNo}조
        </p>
        <p className="text-5xl font-black text-white text-center mb-6">
          {nextHeat.eventName}
        </p>
        <p className="text-2xl text-gray-400 text-center mb-8">{nextHeat.category}</p>

        {/* 선수 그리드 */}
        <div className="grid grid-cols-4 gap-4">
          {[...nextHeat.lanes]
            .sort((a, b) => a.lane - b.lane)
            .map((lane) => (
              <div
                key={lane.lane}
                className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700"
              >
                <p className="text-2xl font-bold text-cyan-400 mb-1">{lane.lane}번 레인</p>
                <p className="text-2xl font-bold text-white">{lane.name}</p>
                <p className="text-lg text-gray-400">{lane.team}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
