'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import {
  emitHeatActivate,
  emitRecordUpdate,
  emitDisplayMode,
  emitAnnouncerPlay,
  emitAnnouncerStop,
  emitMusicLoad,
  emitMusicPlay,
  emitMusicPause,
  emitMusicStop,
  emitMusicVolume,
} from '@/lib/socket';
import type { Heat } from '@/types';
import HeatSelector from '@/components/admin/HeatSelector';
import RecordInput from '@/components/admin/RecordInput';

/** YouTube URL → embed src 변환 (video / playlist 모두 지원) */
function parseYtSrc(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const listId   = u.searchParams.get('list');
    const videoId  = u.searchParams.get('v') ??
      (u.hostname === 'youtu.be' ? u.pathname.slice(1) : null);

    const base = 'https://www.youtube.com/embed';
    // autoplay 제거 — 브라우저 자동재생 정책으로 인한 이중 재생 방지
    // 재생은 🔊 버튼 클릭(기기별 독립) 또는 소켓 명령으로만 시작
    const params = new URLSearchParams({ enablejsapi: '1', loop: '1' });

    if (listId) {
      params.set('list', listId);
      params.set('listType', 'playlist');
      const first = videoId ?? 'videoseries';
      return `${base}/${first}?${params}`;
    }
    if (videoId) {
      params.set('playlist', videoId);   // loop 작동에 필요
      return `${base}/${videoId}?${params}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ControlPage() {
  const {
    currentHeat,
    allHeats,
    nextHeats,
    announcerEnabled,
    setCurrentHeat,
    clearCurrentHeat,
    setAllHeats,
    setDisplayMode,
  } = useGameStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announceStatus, setAnnounceStatus] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');

  // ── 배경 음악 상태 ──
  const [musicUrl, setMusicUrl]         = useState('');
  const [musicVolume, setMusicVolume]   = useState(70);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoaded, setMusicLoaded]   = useState(false);

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

  /** AI 아나운서 자동 방송 — announcerEnabled ON일 때만 실행
   *  1) /api/announcer → 멘트 생성
   *  2) 소켓으로 전광판에 전송 (전광판 브라우저에서 TTS 재생)
   *  3) 조작부에서도 직접 TTS 재생 (브라우저 자동재생 정책 우회)
   */
  const autoAnnounce = useCallback(
    async (heat: Heat, type: 'intro' | 'result', nextHeat?: Heat) => {
      if (!announcerEnabled) return;
      setAnnounceStatus('generating');
      try {
        const res = await fetch('/api/announcer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heat, type, nextHeat }),
        });
        const json = await res.json();
        if (json.ok && json.data?.text) {
          const text: string = json.data.text;
          // 전광판으로 소켓 전송 (전광판에서만 TTS 재생)
          emitAnnouncerPlay(text);
          setAnnounceStatus('playing');
          // 상태 표시만 유지 (실제 재생은 전광판에서)
          setTimeout(() => setAnnounceStatus('idle'), 8000);
        } else {
          console.warn('[Announcer] API 오류:', json.error);
          setAnnounceStatus('error');
          setTimeout(() => setAnnounceStatus('idle'), 3000);
        }
      } catch (e) {
        console.warn('[Announcer] 네트워크 오류:', e);
        setAnnounceStatus('error');
        setTimeout(() => setAnnounceStatus('idle'), 3000);
      }
    },
    [announcerEnabled],
  );

  // 경기 활성화 (대기·진행·완료 경기 모두 선택 가능 — 되돌리기 포함)
  const handleActivate = useCallback(
    async (heat: Heat) => {
      // 현재 재생 중인 경기 음성 즉시 중단
      emitAnnouncerStop();
      let freshHeat: Heat = heat;
      try {
        // 기존 active 경기를 전부 completed 처리
        const activeHeats = allHeats.filter(
          (h) => h.status === 'active' && h.id !== heat.id,
        );
        if (activeHeats.length > 0) {
          await Promise.all(
            activeHeats.map((h) =>
              fetch(`/api/events/${h.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
              }),
            ),
          ).catch(console.error);
        }

        // 선택한 경기 활성화
        await fetch(`/api/events/${heat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        });

        // 최신 데이터 재조회
        const eventRes = await fetch(`/api/events/${heat.id}`).then((r) => r.json());
        if (eventRes.ok) freshHeat = eventRes.data;

        setCurrentHeat(freshHeat);
        emitHeatActivate(freshHeat);
        emitDisplayMode('results');
        setDisplayMode('results');

        // 경기 목록 갱신
        const res = await fetch('/api/events').then((r) => r.json());
        if (res.ok) setAllHeats(res.data);
      } catch (e) {
        console.error('[handleActivate]', e);
      }

      // 오류 여부와 무관하게 방송 실행
      autoAnnounce(freshHeat, 'intro');
    },
    [setCurrentHeat, setDisplayMode, setAllHeats, allHeats, autoAnnounce],
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

  // DB에서 최신 heat 재조회 후 전광판 재전송 → heat 반환
  const refreshAndEmit = useCallback(async (heatId: string): Promise<Heat | null> => {
    const res = await fetch(`/api/events/${heatId}`).then((r) => r.json());
    if (res.ok && res.data) {
      setCurrentHeat(res.data);
      emitHeatActivate(res.data);
      return res.data as Heat;
    }
    return null;
  }, [setCurrentHeat]);

  // 전체 저장 완료 → 전광판 갱신 + ✅ 결과 발표 + 다음 조 준비 안내 자동 방송
  const handleAllSaved = useCallback(async () => {
    if (!currentHeat) return;
    const latestHeat = await refreshAndEmit(currentHeat.id);
    if (latestHeat) {
      // 다음 대기 조 (store의 nextHeats 첫 번째 또는 allHeats에서 탐색)
      const nextPending =
        nextHeats[0] ??
        allHeats
          .filter((h) => h.status === 'pending')
          .sort((a, b) =>
            a.eventNo !== b.eventNo ? a.eventNo - b.eventNo : a.heatNo - b.heatNo,
          )[0];
      autoAnnounce(latestHeat, 'result', nextPending);
    }
  }, [currentHeat, refreshAndEmit, autoAnnounce, nextHeats, allHeats]);

  // 레인 정보 수기 수정
  const handleLaneUpdate = useCallback(
    async (laneNo: number, info: { name: string; team: string; region: string; notes: string }) => {
      if (!currentHeat) return;
      await fetch('/api/lanes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: currentHeat.id, lane: laneNo, ...info }),
      });
      await refreshAndEmit(currentHeat.id);
    },
    [currentHeat, refreshAndEmit],
  );

  // 수기 레인 추가
  const handleLaneAdd = useCallback(
    async (laneNo: number, info: { name: string; team: string; region: string; notes: string }) => {
      if (!currentHeat) return;
      await fetch('/api/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: currentHeat.id, lane: laneNo, ...info }),
      });
      await refreshAndEmit(currentHeat.id);
    },
    [currentHeat, refreshAndEmit],
  );

  // 레인 삭제
  const handleLaneDelete = useCallback(
    async (laneNo: number) => {
      if (!currentHeat) return;
      await fetch('/api/lanes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: currentHeat.id, lane: laneNo }),
      });
      await refreshAndEmit(currentHeat.id);
    },
    [currentHeat, refreshAndEmit],
  );

  // 개별 조 삭제
  const handleDeleteHeat = useCallback(
    async (heat: Heat) => {
      await fetch(`/api/events/${heat.id}`, { method: 'DELETE' });
      // 현재 선택된 경기였으면 해제
      if (currentHeat?.id === heat.id) clearCurrentHeat();
      const res = await fetch('/api/events').then((r) => r.json());
      if (res.ok) setAllHeats(res.data);
    },
    [currentHeat, clearCurrentHeat, setAllHeats],
  );

  // 전체 선수명단 삭제
  const handleDeleteAll = useCallback(async () => {
    await fetch('/api/events', { method: 'DELETE' });
    setAllHeats([]);
    clearCurrentHeat();
  }, [setAllHeats, clearCurrentHeat]);

  // 경기 완료 → 다음 대기 경기 자동 선택 + ✅ 선수 소개 자동 방송
  const handleComplete = useCallback(async () => {
    if (!currentHeat) return;

    // 현재 재생 중인 경기 음성 즉시 중단 (겹침 방지)
    emitAnnouncerStop();

    await fetch(`/api/events/${currentHeat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await fetch('/api/events').then((r) => r.json());
    if (!res.ok) return;
    const updatedHeats: Heat[] = res.data;
    setAllHeats(updatedHeats);

    const nextHeat = updatedHeats
      .filter((h) => h.status === 'pending')
      .sort((a, b) =>
        a.eventNo !== b.eventNo ? a.eventNo - b.eventNo : a.heatNo - b.heatNo,
      )[0];

    if (!nextHeat) return;

    await fetch(`/api/events/${nextHeat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    setCurrentHeat(nextHeat);
    emitHeatActivate(nextHeat);

    const res2 = await fetch('/api/events').then((r) => r.json());
    if (res2.ok) setAllHeats(res2.data);

    // ✅ 다음 경기 선수 소개 자동 방송
    autoAnnounce(nextHeat, 'intro');
  }, [currentHeat, setAllHeats, setCurrentHeat, autoAnnounce]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-xl">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 타이틀 + 유틸 버튼 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">🏊 경기 진행</h1>
        <div className="flex items-center gap-3">
          {/* 자동 방송 상태 뱃지 */}
          {announcerEnabled && announceStatus === 'idle' && (
            <span className="text-xs text-cyan-400 border border-cyan-800 px-3 py-1.5 rounded-lg">
              🎙️ AI 자동 방송 ON
            </span>
          )}
          {announceStatus === 'generating' && (
            <span className="text-xs text-yellow-400 border border-yellow-700 px-3 py-1.5 rounded-lg animate-pulse">
              ✍️ 멘트 생성 중…
            </span>
          )}
          {announceStatus === 'playing' && (
            <span className="text-xs text-green-400 border border-green-700 px-3 py-1.5 rounded-lg animate-pulse">
              🔊 방송 중…
            </span>
          )}
          {announceStatus === 'error' && (
            <span className="text-xs text-red-400 border border-red-700 px-3 py-1.5 rounded-lg">
              ⚠️ 방송 오류
            </span>
          )}
          {/* 수동 방송 테스트 */}
          {currentHeat && announcerEnabled && announceStatus === 'idle' && (
            <button
              onClick={() => autoAnnounce(currentHeat, 'intro')}
              className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 hover:border-purple-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              🎤 방송 테스트
            </button>
          )}
          <button
            onClick={() => { emitDisplayMode('standby'); setDisplayMode('standby'); }}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            대기 화면
          </button>
        </div>
      </div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 경기 선택 */}
        <div className="lg:col-span-1">
          <HeatSelector
            heats={allHeats}
            currentHeatId={currentHeat?.id}
            onActivate={handleActivate}
            onDelete={handleDeleteHeat}
            onDeleteAll={handleDeleteAll}
          />
        </div>

        {/* 오른쪽: 기록 입력 */}
        <div className="lg:col-span-2">
          {currentHeat ? (
            <RecordInput
              heat={currentHeat}
              saving={saving}
              onSave={handleRecordSave}
              onComplete={handleComplete}
              onAllSaved={handleAllSaved}
              onLaneUpdate={handleLaneUpdate}
              onLaneAdd={handleLaneAdd}
              onLaneDelete={handleLaneDelete}
            />
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-dashed border-gray-700 p-12 text-center">
              <p className="text-gray-500 text-lg">← 왼쪽에서 경기를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 배경 음악 컨트롤 ──────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-black text-purple-400 flex items-center gap-2">
          🎵 배경 음악
          {musicPlaying && (
            <span className="text-xs font-normal text-green-400 animate-pulse">● 재생 중</span>
          )}
        </h2>

        {/* URL 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="YouTube URL 또는 재생목록 URL 붙여넣기…"
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-purple-500
                       rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm
                       focus:outline-none transition-colors"
          />
          <button
            onClick={() => {
              const src = parseYtSrc(musicUrl);
              if (!src) return;
              emitMusicLoad(src, musicVolume);
              setMusicLoaded(true);
              setMusicPlaying(true);
            }}
            disabled={!musicUrl.trim()}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-600
                       disabled:bg-gray-800 disabled:text-gray-600
                       text-white rounded-xl font-bold text-sm transition-colors
                       cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            불러오기
          </button>
        </div>

        {/* 재생 컨트롤 */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { emitMusicPlay(); setMusicPlaying(true); }}
            disabled={!musicLoaded}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600
                       disabled:bg-gray-800 disabled:text-gray-600
                       text-white rounded-xl font-bold text-sm transition-colors
                       cursor-pointer disabled:cursor-not-allowed"
          >
            ▶ 재생
          </button>
          <button
            onClick={() => { emitMusicPause(); setMusicPlaying(false); }}
            disabled={!musicLoaded || !musicPlaying}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-700 hover:bg-yellow-600
                       disabled:bg-gray-800 disabled:text-gray-600
                       text-white rounded-xl font-bold text-sm transition-colors
                       cursor-pointer disabled:cursor-not-allowed"
          >
            ⏸ 일시정지
          </button>
          <button
            onClick={() => { emitMusicStop(); setMusicPlaying(false); setMusicLoaded(false); }}
            disabled={!musicLoaded}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-700
                       disabled:bg-gray-800 disabled:text-gray-600
                       text-white rounded-xl font-bold text-sm transition-colors
                       cursor-pointer disabled:cursor-not-allowed"
          >
            ⏹ 정지
          </button>

          {/* 볼륨 슬라이더 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={musicVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMusicVolume(v);
                emitMusicVolume(v);
              }}
              className="w-28 accent-purple-500 cursor-pointer"
            />
            <span className="text-gray-300 text-sm w-8 text-right">{musicVolume}%</span>
          </div>
        </div>

        {/* 빠른 URL 안내 */}
        {!musicLoaded && (
          <p className="text-xs text-gray-600">
            예) https://www.youtube.com/watch?v=xxxxx &nbsp;|&nbsp;
            https://www.youtube.com/playlist?list=xxxxx
          </p>
        )}
      </div>
    </div>
  );
}
