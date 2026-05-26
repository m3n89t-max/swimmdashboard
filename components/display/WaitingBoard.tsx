'use client';

import type { Heat } from '@/types';

interface Props {
  heats: Heat[];
}

export default function WaitingBoard({ heats }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="bg-gray-900 border-b-2 border-yellow-400 px-8 py-5 shrink-0">
        <h1 className="text-4xl font-bold text-yellow-300 text-center tracking-widest">
          ▶ 다음 경기 대기자 명단
        </h1>
      </header>

      <div className="flex-1 flex gap-4 p-6 overflow-hidden">
        {heats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-3xl text-gray-500">대기 중인 경기가 없습니다.</p>
          </div>
        ) : (
          heats.slice(0, 3).map((heat, idx) => (
            <div
              key={heat.id}
              className={`flex-1 flex flex-col rounded-2xl border-2 overflow-hidden ${
                idx === 0
                  ? 'border-cyan-500 bg-cyan-950/30'
                  : 'border-gray-700 bg-gray-900/40'
              }`}
            >
              {/* 조 헤더 */}
              <div
                className={`px-6 py-3 shrink-0 ${
                  idx === 0 ? 'bg-cyan-900/60' : 'bg-gray-800/60'
                }`}
              >
                <p
                  className={`text-2xl font-bold ${
                    idx === 0 ? 'text-cyan-300' : 'text-gray-300'
                  }`}
                >
                  {idx === 0 ? '▶ 다음' : `${idx + 1}번째`}
                </p>
                <p className="text-3xl font-bold text-white mt-1">{heat.eventName}</p>
                <p className="text-xl text-gray-400">
                  제{heat.eventNo}종목 · {heat.heatNo}조 · {heat.category}
                </p>
              </div>

              {/* 선수 목록 */}
              <div className="flex-1 overflow-y-auto">
                {[...heat.lanes]
                  .sort((a, b) => a.lane - b.lane)
                  .map((lane) => (
                    <div
                      key={lane.lane}
                      className="flex items-center gap-4 px-6 py-3 border-b border-gray-800/50"
                    >
                      <span className="w-12 text-center text-2xl font-bold text-cyan-400 shrink-0">
                        {lane.lane}
                      </span>
                      <span className="flex-1 text-2xl font-bold text-white">{lane.name}</span>
                      <span className="text-xl text-gray-400 shrink-0">{lane.team}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
