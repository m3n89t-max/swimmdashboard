'use client';

import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  heat: Heat;
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-yellow-300',
  3: 'text-orange-400',
};

const STATUS_LABEL: Record<string, string> = {
  DNS: 'DNS',
  DQ: 'DQ',
  DSQ: 'DSQ',
};

export default function ResultsBoard({ heat }: Props) {
  const sortedLanes = [...heat.lanes].sort((a, b) => a.lane - b.lane);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <header className="bg-gray-900 border-b-2 border-cyan-500 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-4xl font-bold text-cyan-400">{heat.eventName}</span>
          <span className="text-2xl text-yellow-300 font-semibold">{heat.heatNo}조</span>
          <span className="text-xl text-gray-400">{heat.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">제{heat.eventNo}종목</span>
        </div>
      </header>

      {/* 레인 테이블 */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-2">
        {/* 컬럼 헤더 */}
        <div className="grid grid-cols-[80px_1fr_180px_180px_120px] gap-4 px-6 mb-2">
          <span className="text-xl text-yellow-300 font-bold text-center">레인</span>
          <span className="text-xl text-yellow-300 font-bold">선수명</span>
          <span className="text-xl text-yellow-300 font-bold text-center">소속</span>
          <span className="text-xl text-yellow-300 font-bold text-center">기록</span>
          <span className="text-xl text-yellow-300 font-bold text-center">순위</span>
        </div>

        {/* 레인 행 */}
        {sortedLanes.map((lane) => {
          const isFirst = lane.rank === 1;
          const hasStatus = !!lane.status;
          const rankColor = lane.rank ? RANK_COLORS[lane.rank] ?? 'text-white' : 'text-white';

          return (
            <div
              key={lane.lane}
              className={cn(
                'grid grid-cols-[80px_1fr_180px_180px_120px] gap-4 items-center',
                'rounded-xl px-6 py-3 transition-colors duration-300',
                isFirst
                  ? 'bg-red-950/40 border border-red-500/50'
                  : 'bg-gray-900/60 border border-gray-800',
                hasStatus && 'opacity-50',
              )}
            >
              {/* 레인 번호 */}
              <span className="text-3xl font-bold text-cyan-400 text-center">
                {lane.lane}
              </span>

              {/* 선수명 */}
              <span className="text-3xl font-bold text-white truncate">
                {lane.name}
              </span>

              {/* 소속 */}
              <span className="text-2xl text-gray-300 text-center truncate">
                {lane.team}
              </span>

              {/* 기록 */}
              <span
                className={cn(
                  'text-3xl font-bold text-center font-mono tracking-wider',
                  hasStatus
                    ? 'text-red-400'
                    : lane.record
                    ? 'text-green-400'
                    : 'text-gray-600',
                )}
              >
                {hasStatus
                  ? STATUS_LABEL[lane.status!]
                  : lane.record ?? '—'}
              </span>

              {/* 순위 */}
              <div className="flex justify-center">
                {lane.rank && !hasStatus ? (
                  <span
                    className={cn(
                      'text-4xl font-black',
                      rankColor,
                      isFirst && 'drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]',
                    )}
                  >
                    {lane.rank}위
                  </span>
                ) : (
                  <span className="text-2xl text-gray-600">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 색상 키 */}
      <footer className="bg-gray-900 border-t border-gray-800 px-8 py-3 flex items-center gap-8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-400 inline-block" />
          <span className="text-lg text-gray-300">1위</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-yellow-300 inline-block" />
          <span className="text-lg text-gray-300">2위</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-orange-400 inline-block" />
          <span className="text-lg text-gray-300">3위</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-green-400 inline-block" />
          <span className="text-lg text-gray-300">기록</span>
        </div>
        <div className="ml-auto text-lg text-gray-500">
          DNS: 출전 포기 · DQ: 실격 · DSQ: 자격 박탈
        </div>
      </footer>
    </div>
  );
}
