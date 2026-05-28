'use client';

import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  heat: Heat;
  nextHeats?: Heat[];
}

// 금(1위) · 은(2위) · 동(3위)
const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',   // 금색
  2: 'text-slate-300',    // 은색
  3: 'text-amber-600',    // 동색
};

const STATUS_LABEL: Record<string, string> = {
  DNS: 'DNS',
  DQ: 'DQ',
  DSQ: 'DSQ',
};

export default function ResultsBoard({ heat, nextHeats = [] }: Props) {
  // 순위순 정렬: 순위 있음 → 순위 없음(기록 미입력) → DNS/DQ/DSQ
  const sortedLanes = [...heat.lanes].sort((a, b) => {
    const aStatus = !!a.status;
    const bStatus = !!b.status;
    const aRank = a.rank ?? 999;
    const bRank = b.rank ?? 999;
    if (aStatus && !bStatus) return 1;
    if (!aStatus && bStatus) return -1;
    if (aRank !== bRank) return aRank - bRank;
    return a.lane - b.lane;
  });

  // 기록이 하나라도 입력됐을 때만 비수상권 반투명 적용
  const hasResults = sortedLanes.some((l) => l.rank != null || l.status != null);

  const hasNext = nextHeats.length > 0;

  return (
    <div className="flex h-full">

      {/* ── 왼쪽: 경기 결과 ────────────────────────────── */}
      <div className={cn('flex flex-col', hasNext ? 'flex-1' : 'w-full')}>

        {/* 헤더 */}
        <header className="bg-gray-900 border-b-2 border-cyan-500 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <span className="text-4xl font-bold text-cyan-400">{heat.eventName}</span>
            <span className="text-2xl text-yellow-300 font-semibold">{heat.heatNo}조</span>
            <span className="text-xl text-gray-400">{heat.category}</span>
          </div>
          <span className="text-2xl font-bold text-white">제{heat.eventNo}종목</span>
        </header>

        {/* 레인 테이블 */}
        <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-2">
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-[80px_1fr_160px_130px_160px_120px] gap-3 px-6 mb-2">
            {['레인','선수명','소속','등급','기록','순위'].map((h) => (
              <span key={h} className={cn(
                'text-xl font-bold text-yellow-300',
                h === '레인' || h === '소속' || h === '등급' || h === '기록' || h === '순위'
                  ? 'text-center' : ''
              )}>{h}</span>
            ))}
          </div>

          {/* 레인 행 */}
          {sortedLanes.map((lane) => {
            const isFirst  = lane.rank === 1;
            const isPodium = (lane.rank ?? 0) >= 1 && (lane.rank ?? 0) <= 3;
            const hasStatus = !!lane.status;
            const rankColor = lane.rank ? RANK_COLORS[lane.rank] ?? 'text-white' : 'text-white';

            return (
              <div
                key={lane.lane}
                className={cn(
                  'grid grid-cols-[80px_1fr_160px_130px_160px_120px] gap-3 items-center',
                  'rounded-xl px-6 py-3 transition-colors duration-300',
                  isFirst
                    ? 'bg-yellow-950/30 border border-yellow-500/40'
                    : 'bg-gray-900/60 border border-gray-800',
                  !isPodium && hasResults && 'opacity-40',
                  hasStatus && hasResults && 'opacity-25',
                )}
              >
                <span className="text-3xl font-bold text-cyan-400 text-center">{lane.lane}</span>

                <div className="min-w-0">
                  <span className="text-3xl font-bold text-white truncate block">{lane.name}</span>
                  {lane.notes && <span className="text-sm text-gray-500 truncate block">{lane.notes}</span>}
                </div>

                <span className="text-2xl text-gray-300 text-center truncate">{lane.team}</span>
                <span className="text-lg text-purple-300 text-center truncate">{lane.region || '—'}</span>

                <span className={cn(
                  'text-3xl font-bold text-center font-mono tracking-wider',
                  hasStatus ? 'text-red-400' : lane.record ? 'text-green-400' : 'text-gray-600',
                )}>
                  {hasStatus ? STATUS_LABEL[lane.status!] : lane.record ?? '—'}
                </span>

                <div className="flex justify-center">
                  {lane.rank && !hasStatus ? (
                    <span className={cn(
                      'text-4xl font-black', rankColor,
                      isFirst && 'drop-shadow-[0_0_16px_rgba(250,204,21,0.9)]',
                    )}>
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

      </div>

      {/* ── 오른쪽: 다음 대기 조 사이드바 ────────────── */}
      {hasNext && (
        <aside className="w-88 flex flex-col bg-gray-950 border-l-2 border-yellow-500/40 shrink-0" style={{ width: '340px' }}>

          {/* 준비 신호 헤더 */}
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2 animate-pulse mb-1">
              <span className="w-4 h-4 rounded-full bg-yellow-400 inline-block" />
              <span className="text-yellow-400 font-black text-2xl tracking-wider">다음 조 준비</span>
            </div>
            <p className="text-sm text-gray-500">출발대 이동 준비 안내</p>
          </div>

          {/* 대기 조 목록 — 스크롤 없이 3조를 균등 배분 */}
          <div className="flex-1 overflow-hidden flex flex-col gap-2 p-2">
            {nextHeats.slice(0, 3).map((h, idx) => (
              <div
                key={h.id}
                className={cn(
                  'flex-1 rounded-xl p-3 border flex flex-col min-h-0',
                  idx === 0
                    ? 'bg-yellow-950/40 border-yellow-500/50'
                    : 'bg-gray-900/60 border-gray-700/50',
                )}
              >
                {/* 종목 정보 */}
                <div className="flex items-center gap-2 mb-1 shrink-0">
                  {idx === 0 && (
                    <span className="text-xs font-black text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full animate-pulse">
                      NEXT
                    </span>
                  )}
                  <span className={cn(
                    'text-sm font-bold',
                    idx === 0 ? 'text-yellow-200' : 'text-gray-200',
                  )}>제{h.eventNo}종목 · {h.heatNo}조</span>
                </div>
                <p className={cn(
                  'font-bold leading-tight mb-1 text-base break-keep shrink-0',
                  idx === 0 ? 'text-yellow-300' : 'text-gray-300',
                )}>
                  {h.eventName}
                </p>
                {h.category && (
                  <p className="text-xs text-gray-500 mb-1 shrink-0">{h.category}</p>
                )}

                {/* 선수 목록 — 남은 공간에 균등 배분 */}
                <div className="flex-1 flex flex-col justify-evenly min-h-0 overflow-hidden">
                  {[...h.lanes]
                    .sort((a, b) => a.lane - b.lane)
                    .map((lane) => (
                      <div key={lane.lane} className="flex items-center gap-1.5">
                        <span className="text-cyan-500 w-5 shrink-0 font-bold text-sm text-center">
                          {lane.lane}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'font-semibold text-sm leading-none break-keep',
                            idx === 0 ? 'text-white' : 'text-gray-400',
                          )}>
                            {lane.name}
                          </p>
                          {lane.team && (
                            <p className="text-xs text-gray-500 leading-none mt-0.5">{lane.team}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
