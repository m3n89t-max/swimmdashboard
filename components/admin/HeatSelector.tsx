'use client';

import { useState } from 'react';
import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  heats: Heat[];
  currentHeatId?: string;
  onActivate: (heat: Heat) => void;
  onDelete: (heat: Heat) => void;
  onDeleteAll: () => void;
}

export default function HeatSelector({
  heats,
  currentHeatId,
  onActivate,
  onDelete,
  onDeleteAll,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const grouped = heats.reduce<Record<number, Heat[]>>((acc, h) => {
    if (!acc[h.eventNo]) acc[h.eventNo] = [];
    acc[h.eventNo].push(h);
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-800 bg-gray-900 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">경기 선택</h2>
        {heats.length > 0 && (
          !confirmDeleteAll ? (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              🗑 전체 삭제
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">정말 삭제?</span>
              <button
                onClick={() => { onDeleteAll(); setConfirmDeleteAll(false); }}
                className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg cursor-pointer font-bold"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg cursor-pointer"
              >
                취소
              </button>
            </div>
          )
        )}
      </div>

      <div className="overflow-y-auto flex-1 pb-6">
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
              .map((heat) => {
                const isCurrent  = heat.id === currentHeatId;
                const isActive   = heat.status === 'active';
                const isCompleted = heat.status === 'completed';
                const isDeleting = confirmDeleteId === heat.id;

                return (
                  <div
                    key={heat.id}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3 border-b border-gray-800/50',
                      'transition-colors duration-150',
                      isCurrent
                        ? 'bg-cyan-950/50'
                        : isCompleted
                        ? 'bg-gray-900/40 opacity-60'
                        : 'hover:bg-gray-800/40',
                    )}
                  >
                    {/* 조 정보 */}
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

                    {/* 오른쪽 버튼 영역 */}
                    <div className="flex items-center gap-1.5 shrink-0">

                      {/* 상태 뱃지 */}
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-bold',
                          isActive
                            ? 'bg-cyan-900 text-cyan-300'
                            : isCompleted
                            ? 'bg-green-900/60 text-green-500'
                            : 'bg-gray-800 text-gray-500',
                        )}
                      >
                        {isActive ? '진행' : isCompleted ? '완료' : '대기'}
                      </span>

                      {/* 삭제 확인 모드 */}
                      {isDeleting ? (
                        <>
                          <button
                            onClick={() => { onDelete(heat); setConfirmDeleteId(null); }}
                            className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg cursor-pointer font-bold"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg cursor-pointer"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          {/* 선택 / 되돌리기 버튼 */}
                          {isCompleted ? (
                            /* 완료된 경기 → 되돌리기 */
                            <button
                              onClick={() => onActivate(heat)}
                              className="text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer bg-orange-800 hover:bg-orange-700 text-orange-200"
                              title="이 경기로 되돌아가기"
                            >
                              ↩ 되돌리기
                            </button>
                          ) : (
                            /* 대기·진행 경기 → 선택 */
                            <button
                              onClick={() => onActivate(heat)}
                              className={cn(
                                'text-xs px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer',
                                isCurrent
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-white',
                              )}
                            >
                              {isCurrent ? '선택됨' : '선택'}
                            </button>
                          )}

                          {/* 삭제 버튼 (휴지통 아이콘) */}
                          <button
                            onClick={() => setConfirmDeleteId(heat.id)}
                            className="text-xs px-2 py-1 text-gray-600 hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                            title="이 조 삭제"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
