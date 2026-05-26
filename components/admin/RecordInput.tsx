'use client';

import { useState, useEffect } from 'react';
import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface LaneState {
  record: string;
  status: '' | 'DNS' | 'DQ' | 'DSQ';
}

interface Props {
  heat: Heat;
  saving: boolean;
  onSave: (lane: number, record: string, rank?: number, status?: 'DNS' | 'DQ' | 'DSQ') => Promise<void>;
  onComplete: () => void;
}

const RECORD_RE = /^\d{1,2}:\d{2}\.\d{2}$/;

/** mm:ss.hh → 밀리초 변환 */
function toMs(r: string): number {
  const [min, rest] = r.split(':');
  const [sec, hs] = rest.split('.');
  return Number(min) * 60000 + Number(sec) * 1000 + Number(hs) * 10;
}

export default function RecordInput({ heat, saving, onSave, onComplete }: Props) {
  const [states, setStates] = useState<Record<number, LaneState>>({});
  const [submitting, setSubmitting] = useState(false);

  // heat 변경 시 초기화
  useEffect(() => {
    const init: Record<number, LaneState> = {};
    heat.lanes.forEach((l) => {
      init[l.lane] = {
        record: l.record ?? '',
        status: (l.status as LaneState['status']) ?? '',
      };
    });
    setStates(init);
  }, [heat.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLane = (lane: number, patch: Partial<LaneState>) => {
    setStates((prev) => ({ ...prev, [lane]: { ...prev[lane], ...patch } }));
  };

  /** 유효 기록들을 기준으로 순위 계산 */
  const computeRanks = (): Record<number, number> => {
    const valid = Object.entries(states)
      .filter(([, s]) => RECORD_RE.test(s.record) && !s.status)
      .sort(([, a], [, b]) => toMs(a.record) - toMs(b.record));
    const map: Record<number, number> = {};
    valid.forEach(([lane], i) => (map[Number(lane)] = i + 1));
    return map;
  };

  const handleSaveAll = async () => {
    setSubmitting(true);
    const ranks = computeRanks();
    try {
      for (const lane of heat.lanes) {
        const s = states[lane.lane];
        if (!s) continue;
        await onSave(
          lane.lane,
          s.record || '-',
          ranks[lane.lane],
          s.status || undefined,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sortedLanes = [...heat.lanes].sort((a, b) => a.lane - b.lane);
  const ranks = computeRanks();

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-cyan-400">{heat.eventName}</h2>
            <p className="text-sm text-gray-400">
              제{heat.eventNo}종목 · {heat.heatNo}조 · {heat.category}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveAll}
              disabled={saving || submitting}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              {submitting ? '저장 중…' : '전체 저장'}
            </button>
            <button
              onClick={onComplete}
              className="px-5 py-2 bg-green-800 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              경기 완료
            </button>
          </div>
        </div>
      </div>

      {/* 레인별 기록 입력 */}
      <div className="divide-y divide-gray-800">
        {sortedLanes.map((lane) => {
          const s = states[lane.lane] ?? { record: '', status: '' };
          const rank = ranks[lane.lane];
          const isValid = RECORD_RE.test(s.record);

          return (
            <div key={lane.lane} className="flex items-center gap-4 px-6 py-4">
              {/* 레인 번호 */}
              <span className="w-10 text-xl font-black text-cyan-400 text-center shrink-0">
                {lane.lane}
              </span>

              {/* 선수 정보 */}
              <div className="w-40 shrink-0">
                <p className="font-bold text-white truncate">{lane.name}</p>
                <p className="text-xs text-gray-500 truncate">{lane.team}</p>
              </div>

              {/* 기록 입력 */}
              <input
                type="text"
                value={s.record}
                onChange={(e) => setLane(lane.lane, { record: e.target.value, status: '' })}
                placeholder="mm:ss.hh"
                disabled={!!s.status}
                className={cn(
                  'w-36 px-3 py-2 rounded-lg text-center font-mono font-bold text-lg',
                  'bg-gray-800 border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500',
                  s.status ? 'opacity-40 cursor-not-allowed border-gray-700' :
                  isValid ? 'border-green-600 text-green-400' :
                  s.record ? 'border-red-600 text-red-400' :
                  'border-gray-700 text-white',
                )}
              />

              {/* DNS / DQ / DSQ 버튼 */}
              <div className="flex gap-2">
                {(['DNS', 'DQ', 'DSQ'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() =>
                      setLane(lane.lane, {
                        status: s.status === st ? '' : st,
                        record: s.status === st ? s.record : '',
                      })
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                      s.status === st
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-400',
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* 순위 표시 */}
              <div className="ml-auto w-16 text-center shrink-0">
                {s.status ? (
                  <span className="text-red-400 font-bold text-sm">{s.status}</span>
                ) : rank ? (
                  <span
                    className={cn(
                      'text-2xl font-black',
                      rank === 1 ? 'text-red-400' :
                      rank === 2 ? 'text-yellow-300' :
                      rank === 3 ? 'text-orange-400' :
                      'text-gray-400',
                    )}
                  >
                    {rank}위
                  </span>
                ) : (
                  <span className="text-gray-600 text-lg">—</span>
                )}
              </div>

              {/* 개별 저장 버튼 */}
              <button
                onClick={() =>
                  onSave(lane.lane, s.record || '-', ranks[lane.lane], s.status || undefined)
                }
                disabled={saving}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                저장
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
