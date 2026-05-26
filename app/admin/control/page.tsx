'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import {
  emitHeatActivate,
  emitRecordUpdate,
  emitDisplayMode,
} from '@/lib/socket';
import type { Heat, DisplayMode } from '@/types';
import HeatSelector from '@/components/admin/HeatSelector';
import RecordInput from '@/components/admin/RecordInput';

const DISPLAY_MODES: { mode: DisplayMode; label: string; color: string }[] = [
  { mode: 'results', label: '경기 결과', color: 'bg-cyan-700 hover:bg-cyan-600' },
  { mode: 'waiting', label: '대기자 명단', color: 'bg-yellow-700 hover:bg-yellow-600' },
  { mode: 'ready', label: '출발대 이동', color: 'bg-orange-700 hover:bg-orange-600' },
  { mode: 'standby', label: '대기 화면', color: 'bg-gray-700 hover:bg-gray-600' },
];

export default function ControlPage() {
  const { currentHeat, allHeats, setCurrentHeat, setAllHeats, setDisplayMode } =
    useGameStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 경기 목록 로드
  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setAllHeats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setAllHeats]);

  // 경기 활성화
  const handleActivate = useCallback(
    async (heat: Heat) => {
      await fetch(`/api/events/${heat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      setCurrentHeat(heat);
      emitHeatActivate(heat);
      emitDisplayMode('results');
      setDisplayMode('results');
    },
    [setCurrentHeat, setDisplayMode],
  );

  // 기록 저장 & 전광판 반영
  const handleRecordSave = useCallback(
    async (lane: number, record: string, rank?: number, status?: 'DNS' | 'DQ' | 'DSQ') => {
      if (!currentHeat) return;
      setSaving(true);
      try {
        await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: currentHeat.id, lane, record, rank, status }),
        });
        emitRecordUpdate({ lane, record, rank, status });
      } finally {
        setSaving(false);
      }
    },
    [currentHeat],
  );

  // 경기 완료 처리
  const handleComplete = useCallback(async () => {
    if (!currentHeat) return;
    await fetch(`/api/events/${currentHeat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    // 전광판 자동 전환: 대기자 → 출발대 이동
    emitDisplayMode('waiting');
    setDisplayMode('waiting');
    setTimeout(() => {
      emitDisplayMode('ready');
      setDisplayMode('ready');
    }, 30_000);
  }, [currentHeat, setDisplayMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-xl">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">🏊 경기 진행</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 경기 선택 */}
        <div className="lg:col-span-1">
          <HeatSelector
            heats={allHeats}
            currentHeatId={currentHeat?.id}
            onActivate={handleActivate}
          />
        </div>

        {/* 오른쪽: 기록 입력 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 전광판 모드 버튼 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
              전광판 화면 전환
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {DISPLAY_MODES.map(({ mode, label, color }) => (
                <button
                  key={mode}
                  onClick={() => {
                    emitDisplayMode(mode);
                    setDisplayMode(mode);
                  }}
                  className={`${color} text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors cursor-pointer`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 기록 입력 */}
          {currentHeat ? (
            <RecordInput
              heat={currentHeat}
              saving={saving}
              onSave={handleRecordSave}
              onComplete={handleComplete}
            />
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-dashed border-gray-700 p-12 text-center">
              <p className="text-gray-500 text-lg">← 왼쪽에서 경기를 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
