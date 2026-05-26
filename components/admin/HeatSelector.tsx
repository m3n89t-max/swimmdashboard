'use client';

import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  heats: Heat[];
  currentHeatId?: string;
  onActivate: (heat: Heat) => void;
}

export default function HeatSelector({ heats, currentHeatId, onActivate }: Props) {
  const grouped = heats.reduce<Record<number, Heat[]>>((acc, h) => {
    if (!acc[h.eventNo]) acc[h.eventNo] = [];
    acc[h.eventNo].push(h);
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden h-full max-h-[calc(100vh-200px)]">
      <div className="px-5 py-4 border-b border-gray-800 bg-gray-900 sticky top-0">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">경기 선택</h2>
      </div>
      <div className="overflow-y-auto h-full pb-4">
        {Object.entries(grouped).map(([eventNo, eventHeats]) => (
          <div key={eventNo}>
            {/* 종목 헤더 */}
            <div className="px-5 py-2 bg-gray-800/50 border-y border-gray-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                제{eventNo}종목 — {eventHeats[0].eventName}
              </span>
            </div>
            {/* 조 목록 */}
            {eventHeats
              .sort((a, b) => a.heatNo - b.heatNo)
              .map((heat) => (
                <div
                  key={heat.id}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3 border-b border-gray-800/50',
                    'transition-colors duration-150',
                    heat.id === currentHeatId
                      ? 'bg-cyan-950/50'
                      : 'hover:bg-gray-800/40',
                    heat.status === 'completed' && 'opacity-40',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">
                      {heat.heatNo}조
                      <span className="ml-2 text-gray-400 font-normal text-xs">
                        {heat.category}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {heat.lanes.map((l) => l.name).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-bold',
                        heat.status === 'active'
                          ? 'bg-cyan-900 text-cyan-300'
                          : heat.status === 'completed'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-gray-800 text-gray-500',
                      )}
                    >
                      {heat.status === 'active' ? '진행' : heat.status === 'completed' ? '완료' : '대기'}
                    </span>
                    {heat.status !== 'completed' && (
                      <button
                        onClick={() => onActivate(heat)}
                        className={cn(
                          'text-xs px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer',
                          heat.id === currentHeatId
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-white',
                        )}
                      >
                        {heat.id === currentHeatId ? '선택됨' : '선택'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}
        {heats.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>대진표를 먼저 업로드해 주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
