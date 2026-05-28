'use client';

import { useState, useEffect } from 'react';
import type { Heat } from '@/types';
import { cn } from '@/lib/utils';

interface LaneInfo {
  name: string;
  team: string;
  region: string;
  notes: string;
}

interface Props {
  heat: Heat;
  saving: boolean;
  onSave: (lane: number, record: string, rank?: number, status?: 'DNS' | 'DQ' | 'DSQ') => Promise<void>;
  onComplete: () => void;
  onAllSaved?: () => Promise<void>;
  onLaneUpdate?: (laneNo: number, info: LaneInfo) => Promise<void>;
  onLaneAdd?: (laneNo: number, info: LaneInfo) => Promise<void>;
  onLaneDelete?: (laneNo: number) => Promise<void>;
}

interface LaneState {
  record: string;
  status: '' | 'DNS' | 'DQ' | 'DSQ';
}

/**
 * 허용 형식:
 *   mm:ss.hh  (예: 1:54.08)
 *   mm:ss:hh  (예: 1:54:08 → 자동 변환)
 *   ss.hh     (예: 54.09  → 0:54.09 로 자동 변환)
 */
const RECORD_RE = /^(\d{1,2}:\d{2}[.:]\d{2}|\d{1,2}\.\d{2})$/;

/** 입력값 정규화: ss.hh → 0:ss.hh, mm:ss:hh → mm:ss.hh */
function normalizeRecord(r: string): string {
  // mm:ss:hh → mm:ss.hh
  r = r.replace(/^(\d{1,2}:\d{2}):(\d{2})$/, '$1.$2');
  // ss.hh → 0:ss.hh (초 단위만 입력한 경우)
  const secOnly = r.match(/^(\d{1,2})\.(\d{2})$/);
  if (secOnly) {
    const sec = secOnly[1].padStart(2, '0');
    r = `0:${sec}.${secOnly[2]}`;
  }
  return r;
}

/** 기록 → 밀리초 (정규화 후 계산) */
function toMs(r: string): number {
  const n = normalizeRecord(r);
  const [min, rest] = n.split(':');
  const [sec, hs] = (rest ?? '0.0').split('.');
  return Number(min) * 60000 + Number(sec) * 1000 + Number(hs ?? 0) * 10;
}

const EMPTY_INFO: LaneInfo = { name: '', team: '', region: '', notes: '' };

export default function RecordInput({
  heat,
  saving,
  onSave,
  onComplete,
  onAllSaved,
  onLaneUpdate,
  onLaneAdd,
  onLaneDelete,
}: Props) {
  /* ── 기록 입력 상태 ── */
  const [states, setStates] = useState<Record<number, LaneState>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ── 레인 편집 상태 ── */
  const [editingLane, setEditingLane] = useState<number | null>(null);
  const [editInfo, setEditInfo] = useState<LaneInfo>(EMPTY_INFO);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* ── 레인 삭제 확인 상태 ── */
  const [deletingLane, setDeletingLane] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /* ── 수기 추가 상태 ── */
  const [showAdd, setShowAdd] = useState(false);
  const [newLaneNo, setNewLaneNo] = useState<number>(1);
  const [newInfo, setNewInfo] = useState<LaneInfo>(EMPTY_INFO);

  // heat 변경 시 기록 상태 초기화 (콜론 구분 → 점 구분 정규화)
  useEffect(() => {
    const init: Record<number, LaneState> = {};
    heat.lanes.forEach((l) => {
      init[l.lane] = {
        record: normalizeRecord(l.record ?? ''),
        status: (l.status as LaneState['status']) ?? '',
      };
    });
    setStates(init);
    setEditingLane(null);
    setShowAdd(false);
  }, [heat.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLane = (lane: number, patch: Partial<LaneState>) =>
    setStates((prev) => ({ ...prev, [lane]: { ...prev[lane], ...patch } }));

  /** 유효 기록들 기준 순위 계산 */
  const computeRanks = (): Record<number, number> => {
    const valid = Object.entries(states)
      .filter(([, s]) => RECORD_RE.test(s.record) && !s.status)
      .sort(([, a], [, b]) => toMs(a.record) - toMs(b.record));
    const map: Record<number, number> = {};
    valid.forEach(([lane], i) => (map[Number(lane)] = i + 1));
    return map;
  };

  /** 전체 저장 */
  const handleSaveAll = async () => {
    setSubmitting(true);
    const ranks = computeRanks();
    try {
      for (const lane of heat.lanes) {
        const s = states[lane.lane];
        if (!s) continue;
        await onSave(
          lane.lane,
          normalizeRecord(s.record) || '-',
          ranks[lane.lane],
          s.status || undefined,
        );
      }
      await onAllSaved?.();
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 레인 편집 핸들러 ── */
  const startEdit = (lane: { lane: number; name: string; team: string; region: string; notes?: string }) => {
    setEditingLane(lane.lane);
    setEditInfo({
      name: lane.name,
      team: lane.team,
      region: lane.region ?? '',
      notes: lane.notes ?? '',
    });
  };

  const saveEdit = async () => {
    if (!onLaneUpdate || editingLane === null) return;
    setEditSubmitting(true);
    try {
      await onLaneUpdate(editingLane, editInfo);
      setEditingLane(null);
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ── 레인 삭제 핸들러 ── */
  const confirmDelete = async (laneNo: number) => {
    if (!onLaneDelete) return;
    setDeleteSubmitting(true);
    try {
      await onLaneDelete(laneNo);
      setDeletingLane(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /* ── 수기 추가 핸들러 ── */
  const saveNewLane = async () => {
    if (!onLaneAdd || !newInfo.name) return;
    setEditSubmitting(true);
    try {
      await onLaneAdd(newLaneNo, newInfo);
      setShowAdd(false);
      setNewLaneNo(1);
      setNewInfo(EMPTY_INFO);
    } finally {
      setEditSubmitting(false);
    }
  };

  const sortedLanes = [...heat.lanes].sort((a, b) => a.lane - b.lane);
  const ranks = computeRanks();

  /* ── 사용 중인 레인 번호 목록 (추가 시 제외) ── */
  const usedLanes = new Set(heat.lanes.map((l) => l.lane));
  const availableLanes = Array.from({ length: 10 }, (_, i) => i + 1).filter(
    (n) => !usedLanes.has(n),
  );

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-cyan-400">{heat.eventName}</h2>
            <p className="text-sm text-gray-400">
              제{heat.eventNo}종목 · {heat.heatNo}조{heat.category ? ` · ${heat.category}` : ''}
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

      {/* ── 레인별 행 ── */}
      <div className="divide-y divide-gray-800">
        {sortedLanes.map((lane) => {
          const s = states[lane.lane] ?? { record: '', status: '' };
          const rank = ranks[lane.lane];
          const isValid = RECORD_RE.test(s.record);
          const isEditing = editingLane === lane.lane;
          const isDeleting = deletingLane === lane.lane;

          return (
            <div key={lane.lane} className="px-6 py-3">
              {isDeleting ? (
                /* ── 삭제 확인 모드 ── */
                <div className="flex items-center gap-3 py-1">
                  <span className="text-xl font-black text-cyan-400 w-10 text-center shrink-0">
                    {lane.lane}
                  </span>
                  <p className="text-sm text-red-400 font-bold flex-1">
                    🗑 <span className="text-white font-black">{lane.name}</span> 선수를 삭제하시겠습니까?
                  </p>
                  <button
                    onClick={() => confirmDelete(lane.lane)}
                    disabled={deleteSubmitting}
                    className="px-4 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                  >
                    {deleteSubmitting ? '삭제 중…' : '삭제'}
                  </button>
                  <button
                    onClick={() => setDeletingLane(null)}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              ) : isEditing ? (
                /* ── 편집 모드 ── */
                <div className="space-y-2">
                  <p className="text-xs text-yellow-400 font-bold mb-1">
                    ✏️ {lane.lane}번 레인 수기 수정
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">선수명 *</label>
                      <input
                        value={editInfo.name}
                        onChange={(e) => setEditInfo((p) => ({ ...p, name: e.target.value }))}
                        placeholder="이름 (계영: 이름1, 이름2)"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">소속 *</label>
                      <input
                        value={editInfo.team}
                        onChange={(e) => setEditInfo((p) => ({ ...p, team: e.target.value }))}
                        placeholder="소속 팀"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">등급</label>
                      <input
                        value={editInfo.region}
                        onChange={(e) => setEditInfo((p) => ({ ...p, region: e.target.value }))}
                        placeholder="S14, 비장애 등"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">비고</label>
                      <input
                        value={editInfo.notes}
                        onChange={(e) => setEditInfo((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="중등, 고등 등"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setEditingLane(null)}
                      className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={editSubmitting || !editInfo.name}
                      className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      {editSubmitting ? '저장 중…' : '수정 저장'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 일반 모드 ── */
                <div className="flex items-center gap-4">
                  {/* 레인 번호 */}
                  <span className="w-10 text-xl font-black text-cyan-400 text-center shrink-0">
                    {lane.lane}
                  </span>

                  {/* 선수 정보 */}
                  <div className="w-44 shrink-0">
                    <p className="font-bold text-white truncate">{lane.name}</p>
                    <p className="text-xs text-gray-500 truncate">{lane.team}</p>
                    {(lane.region || lane.notes) && (
                      <p className="text-xs text-purple-400 truncate">
                        {[lane.region, lane.notes].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* 편집 버튼 */}
                  <button
                    onClick={() => startEdit(lane)}
                    title="선수 정보 수정"
                    className="shrink-0 p-1.5 text-gray-600 hover:text-yellow-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  >
                    ✏️
                  </button>

                  {/* 레인 삭제 버튼 */}
                  {onLaneDelete && (
                    <button
                      onClick={() => setDeletingLane(lane.lane)}
                      title="이 레인 삭제"
                      className="shrink-0 p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      🗑
                    </button>
                  )}

                  {/* 기록 입력 */}
                  <input
                    type="text"
                    value={s.record}
                    onChange={(e) => setLane(lane.lane, { record: e.target.value, status: '' })}
                    placeholder="54.09 or 1:54.08"
                    disabled={!!s.status}
                    className={cn(
                      'w-32 px-3 py-2 rounded-lg text-center font-mono font-bold text-lg',
                      'bg-gray-800 border transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-cyan-500',
                      s.status
                        ? 'opacity-40 cursor-not-allowed border-gray-700'
                        : isValid
                        ? 'border-green-600 text-green-400'
                        : s.record
                        ? 'border-red-600 text-red-400'
                        : 'border-gray-700 text-white',
                    )}
                  />

                  {/* DNS / DQ / DSQ */}
                  <div className="flex gap-1.5">
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
                          'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                          s.status === st
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-400',
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* 순위 */}
                  <div className="ml-auto w-14 text-center shrink-0">
                    {s.status ? (
                      <span className="text-red-400 font-bold text-sm">{s.status}</span>
                    ) : rank ? (
                      <span
                        className={cn(
                          'text-2xl font-black',
                          rank === 1
                            ? 'text-yellow-400'   // 금
                            : rank === 2
                            ? 'text-slate-300'    // 은
                            : rank === 3
                            ? 'text-amber-600'    // 동
                            : 'text-gray-400',
                        )}
                      >
                        {rank}위
                      </span>
                    ) : (
                      <span className="text-gray-600 text-lg">—</span>
                    )}
                  </div>

                  {/* 개별 저장 */}
                  <button
                    onClick={() =>
                      onSave(
                        lane.lane,
                        normalizeRecord(s.record) || '-',
                        ranks[lane.lane],
                        s.status || undefined,
                      )
                    }
                    disabled={saving}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 수기 레인 추가 ── */}
      <div className="border-t border-gray-800 px-6 py-4">
        {!showAdd ? (
          <button
            onClick={() => {
              setShowAdd(true);
              setNewLaneNo(availableLanes[0] ?? 1);
              setNewInfo(EMPTY_INFO);
            }}
            className="w-full py-2.5 border-2 border-dashed border-gray-700 hover:border-cyan-600 text-gray-500 hover:text-cyan-400 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            ＋ 수기 레인 추가 (돌발 선수 등록)
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-cyan-400">📝 수기 선수 등록</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">레인 번호 *</label>
                <select
                  value={newLaneNo}
                  onChange={(e) => setNewLaneNo(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  {/* 비어 있는 레인 우선, 그 다음 전체 1-10 */}
                  {availableLanes.length > 0
                    ? availableLanes.map((n) => (
                        <option key={n} value={n}>
                          {n}번 레인 (빈 레인)
                        </option>
                      ))
                    : Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}번 레인
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">선수명 *</label>
                <input
                  value={newInfo.name}
                  onChange={(e) => setNewInfo((p) => ({ ...p, name: e.target.value }))}
                  placeholder="이름 (계영: 이름1, 이름2)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">소속 *</label>
                <input
                  value={newInfo.team}
                  onChange={(e) => setNewInfo((p) => ({ ...p, team: e.target.value }))}
                  placeholder="소속 팀"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">등급</label>
                <input
                  value={newInfo.region}
                  onChange={(e) => setNewInfo((p) => ({ ...p, region: e.target.value }))}
                  placeholder="S14, 비장애 등"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">비고</label>
                <input
                  value={newInfo.notes}
                  onChange={(e) => setNewInfo((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="중등, 고등 등"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={saveNewLane}
                disabled={editSubmitting || !newInfo.name || !newInfo.team}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                {editSubmitting ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
