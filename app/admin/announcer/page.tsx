'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { emitAnnouncerPlay, emitAnnouncerEmergency, emitSubtitle, emitEmergency, emitEmergencyHide, emitAnnouncerStop } from '@/lib/socket';
import { stopSpeech } from '@/lib/tts';
import { cn } from '@/lib/utils';

const DEFAULT_PRESETS = [
  '잠시 후 경기가 재개됩니다. 관람객 여러분께서는 자리를 지켜주시기 바랍니다.',
  '화장실은 1층 로비 양쪽에 위치하고 있습니다.',
  '경기장 내에서는 플래시 사용을 삼가주시기 바랍니다.',
  '선수 여러분의 준비를 위해 잠시 대기합니다.',
  '오늘 대회에 참가하신 모든 선수 여러분, 수고하셨습니다!',
];

type Tab = 'ai' | 'subtitle' | 'emergency';

export default function AnnouncerPage() {
  const { currentHeat, announcerEnabled, setAnnouncerEnabled } = useGameStore();

  const [tab, setTab] = useState<Tab>('ai');

  // ── AI 방송 상태 ──
  const [loading, setLoading]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText]         = useState('');
  const [error, setError]       = useState('');

  // ── 자막 상태 ──
  const [subtitleInput, setSubtitleInput] = useState('');
  const [liveSubtitle, setLiveSubtitle]   = useState('');

  // ── 긴급전달 상태 ──
  const [emergencyInput, setEmergencyInput]   = useState('');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [popupShowing, setPopupShowing]       = useState(false);  // 전광판 팝업 표시 여부
  const emergencyStopRef = useRef(false);    // 반복 TTS 중단 플래그

  const [presets, setPresets] = useState<string[]>(DEFAULT_PRESETS);

  // 마운트 후 localStorage에서 불러오기 (SSR hydration 충돌 방지)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('subtitle-presets') ?? 'null');
      if (Array.isArray(saved) && saved.length === DEFAULT_PRESETS.length) {
        setPresets(saved);
      }
    } catch { /* 무시 */ }
  }, []);
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selected, setSelected]       = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const sendSelected = useCallback(() => {
    const texts = Array.from(selected).sort().map((i) => presets[i]).filter(Boolean);
    if (!texts.length) return;
    const joined = texts.join('     ◈     ');
    emitSubtitle(joined);
    setLiveSubtitle(joined);
    setSelected(new Set());
  }, [selected, presets]);

  // ── AI 방송 ──
  // TTS는 전광판에서만 재생 (조작부 로컬 speakNatural 제거 → 에코/이중음성 방지)
  const generate = async (type: 'intro' | 'result') => {
    if (!currentHeat) return;
    setLoading(true);
    setError('');
    setText('');
    try {
      const res  = await fetch('/api/announcer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ heat: currentHeat, type }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const generated: string = json.data.text;
      setText(generated);
      emitAnnouncerPlay(generated);   // 전광판으로 소켓 전송 → 전광판에서만 TTS 재생
      setSpeaking(true);
      // 글자 수 기반으로 방송 시간 추정 후 상태 해제
      const ms = Math.max(4000, Math.ceil(generated.replace(/\s/g, '').length / 4) * 1000 + 2000);
      setTimeout(() => setSpeaking(false), ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setSpeaking(false);
    } finally {
      setLoading(false);
    }
  };

  const replay = useCallback(() => {
    if (!text) return;
    emitAnnouncerPlay(text);   // 전광판에서만 TTS 재생
    setSpeaking(true);
    const ms = Math.max(4000, Math.ceil(text.replace(/\s/g, '').length / 4) * 1000 + 2000);
    setTimeout(() => setSpeaking(false), ms);
  }, [text]);

  // ── 자막 ──
  const sendSubtitle = useCallback(() => {
    const t = subtitleInput.trim();
    if (!t) return;
    emitSubtitle(t);
    setLiveSubtitle(t);
    setSubtitleInput('');
  }, [subtitleInput]);

  const clearSubtitle = useCallback(() => {
    emitSubtitle('');
    setLiveSubtitle('');
    setSubtitleInput('');
  }, []);

  // ── 긴급전달 ──
  const startEmergency = useCallback(async () => {
    const t = emergencyInput.trim();
    if (!t) return;
    emergencyStopRef.current = false;
    setEmergencyActive(true);
    setPopupShowing(true);

    // 전광판 팝업 표시
    emitEmergency(t);

    // 긴급 채널로 반복 재생 (여성 목소리 — 경기 채널과 완전 분리)
    const loop = async () => {
      while (!emergencyStopRef.current) {
        emitAnnouncerEmergency(t);
        // 텍스트 길이 기반 대기 (4글자/초 + 3초 여유, 최소 5초)
        const ms = Math.max(5000, Math.ceil(t.replace(/\s/g, '').length / 4) * 1000 + 3000);
        await new Promise<void>((resolve) => {
          let elapsed = 0;
          const id = setInterval(() => {
            elapsed += 200;
            if (emergencyStopRef.current || elapsed >= ms) {
              clearInterval(id);
              resolve();
            }
          }, 200);
        });
      }
      setEmergencyActive(false);
    };
    loop();
  }, [emergencyInput]);

  // 음성만 멈춤 — 전광판 팝업은 유지
  const stopVoice = useCallback(() => {
    emergencyStopRef.current = true;
    stopSpeech();
    emitAnnouncerStop();
    setEmergencyActive(false);
  }, []);

  // 전광판 팝업만 해제
  const hidePopup = useCallback(() => {
    emitEmergencyHide();
    setPopupShowing(false);
  }, []);

  const savePreset = useCallback((idx: number, text: string) => {
    const next = presets.map((p, i) => i === idx ? text : p);
    setPresets(next);
    localStorage.setItem('subtitle-presets', JSON.stringify(next));
    setEditingIdx(null);
  }, [presets]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* 페이지 타이틀 */}
      <h1 className="text-3xl font-black text-white">📢 안내방송</h1>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setTab('ai')}
          className={cn(
            'px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors cursor-pointer',
            tab === 'ai'
              ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-500 hover:text-gray-300',
          )}
        >
          🤖 AI 자동 방송
        </button>
        <button
          onClick={() => setTab('subtitle')}
          className={cn(
            'px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors cursor-pointer',
            tab === 'subtitle'
              ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-400'
              : 'text-gray-500 hover:text-gray-300',
          )}
        >
          📺 자막 수기 입력
        </button>
        <button
          onClick={() => setTab('emergency')}
          className={cn(
            'px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors cursor-pointer',
            tab === 'emergency'
              ? 'bg-gray-800 text-red-400 border-b-2 border-red-500'
              : 'text-gray-500 hover:text-red-400',
            (emergencyActive || popupShowing) && 'animate-pulse',
          )}
        >
          🚨 긴급전달
          {emergencyActive && <span className="ml-1 text-xs text-red-400">● 방송중</span>}
          {!emergencyActive && popupShowing && <span className="ml-1 text-xs text-orange-400">● 팝업중</span>}
        </button>
      </div>

      {/* ── AI 자동 방송 탭 ── */}
      {tab === 'ai' && (
        <div className="space-y-6">
          {/* 자동 방송 토글 */}
          <div
            onClick={() => setAnnouncerEnabled(!announcerEnabled)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors',
              announcerEnabled
                ? 'bg-cyan-900/40 border-cyan-600 text-cyan-300'
                : 'bg-gray-800 border-gray-700 text-gray-400',
            )}
          >
            <div className={cn('relative w-10 h-5 rounded-full transition-colors', announcerEnabled ? 'bg-cyan-500' : 'bg-gray-600')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', announcerEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
            </div>
            <span className="text-sm font-bold">
              {announcerEnabled ? '🤖 자동 방송 ON — 경기 활성화·저장 시 자동 생성' : '자동 방송 OFF'}
            </span>
          </div>

          {/* 현재 경기 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">현재 경기</h2>
            {currentHeat ? (
              <div>
                <p className="text-2xl font-black text-cyan-400">{currentHeat.eventName}</p>
                <p className="text-gray-400">
                  제{currentHeat.eventNo}종목 · {currentHeat.heatNo}조
                  {currentHeat.category ? ` · ${currentHeat.category}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">경기 진행 탭에서 경기를 먼저 선택하세요.</p>
            )}
          </div>

          {/* 수동 방송 버튼 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => generate('intro')}
              disabled={!currentHeat || loading || speaking}
              className="py-6 bg-blue-800 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? '생성 중…' : speaking ? '🔊 방송 중…' : '🎤 경기 시작 멘트'}
            </button>
            <button
              onClick={() => generate('result')}
              disabled={!currentHeat || loading || speaking}
              className="py-6 bg-green-800 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? '생성 중…' : speaking ? '🔊 방송 중…' : '🏆 결과 발표 멘트'}
            </button>
          </div>

          {/* 멈춤 버튼 */}
          {speaking && (
            <button
              onClick={() => { emitAnnouncerStop(); setSpeaking(false); }}
              className="w-full py-4 bg-red-700 hover:bg-red-600 text-white rounded-2xl font-black text-xl transition-colors cursor-pointer animate-pulse"
            >
              ⏹ 전광판 음성 멈춤
            </button>
          )}

          {/* 생성된 멘트 */}
          {text && (
            <div className="bg-gray-900 rounded-2xl border border-cyan-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">생성된 방송 멘트</h2>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-800 text-blue-400">
                  📺 전광판 재생
                </span>
              </div>
              <p className="text-2xl text-white leading-relaxed">{text}</p>
              <div className="flex gap-3">
                <button
                  onClick={replay}
                  disabled={speaking}
                  className="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-800 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {speaking ? '🔊 재생 중…' : '🔊 다시 재생'}
                </button>
                {speaking && (
                  <button
                    onClick={() => { emitAnnouncerStop(); setSpeaking(false); }}
                    className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    ⏹ 멈춤
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-red-300">{error}</div>
          )}
        </div>
      )}

      {/* ── 긴급전달 탭 ── */}
      {tab === 'emergency' && (
        <div className="space-y-6">

          {/* 방송 중 / 팝업 표시 상태 배너 */}
          {(emergencyActive || popupShowing) && (
            <div className="bg-red-950/60 border-2 border-red-600 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-4xl animate-pulse">🚨</span>
                <div className="flex-1">
                  <p className="text-lg font-black text-red-400 animate-pulse">
                    {emergencyActive ? '긴급 방송 중…' : '전광판 팝업 표시 중'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{emergencyInput}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {/* 음성만 멈춤 — 팝업은 그대로 */}
                {emergencyActive && (
                  <button
                    onClick={stopVoice}
                    className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-black text-lg cursor-pointer transition-colors animate-pulse"
                  >
                    ■ 음성 멈춤
                  </button>
                )}
                {/* 팝업만 해제 */}
                {popupShowing && (
                  <button
                    onClick={hidePopup}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-black text-lg cursor-pointer transition-colors"
                  >
                    ✕ 팝업 해제
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 입력 영역 */}
          <div className="bg-gray-900 rounded-2xl border border-red-900/50 p-6 space-y-4">
            <h2 className="text-sm font-black text-red-400 uppercase tracking-wider">
              🚨 긴급 전달사항 입력
            </h2>
            <p className="text-xs text-gray-500">
              전송 시 전광판 중앙에 팝업이 표시되고, 멈춤 버튼을 누를 때까지 반복 방송됩니다.
            </p>
            <textarea
              value={emergencyInput}
              onChange={(e) => setEmergencyInput(e.target.value)}
              disabled={emergencyActive}
              placeholder="긴급 전달사항을 입력하세요…&#10;예) 경기가 일시 중단됩니다. 잠시만 기다려 주십시오."
              rows={4}
              className={cn(
                'w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-600',
                'focus:outline-none transition-colors resize-none text-lg leading-relaxed',
                emergencyActive
                  ? 'border-gray-700 opacity-50 cursor-not-allowed'
                  : 'border-red-900/50 focus:border-red-500',
              )}
            />

            {!emergencyActive ? (
              <button
                onClick={startEmergency}
                disabled={!emergencyInput.trim()}
                className={cn(
                  'w-full py-4 rounded-xl font-black text-xl transition-colors cursor-pointer',
                  emergencyInput.trim()
                    ? 'bg-red-700 hover:bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed',
                )}
              >
                🚨 긴급 방송 시작
              </button>
            ) : (
              <button
                onClick={stopVoice}
                className="w-full py-4 bg-orange-800 hover:bg-orange-700 text-white rounded-xl font-black text-xl cursor-pointer transition-colors animate-pulse"
              >
                ■ 음성만 멈춤
              </button>
            )}
          </div>

          {/* 빠른 전달 프리셋 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">빠른 전달 문구</h2>
            <div className="grid grid-cols-1 gap-2">
              {[
                '경기가 일시 중단됩니다. 잠시만 기다려 주십시오.',
                '안전 요원이 출동 중입니다. 침착하게 대기해 주십시오.',
                '기술적인 문제로 잠시 경기가 지연됩니다.',
                '전 관계자는 즉시 본부석으로 집결해 주십시오.',
              ].map((preset) => (
                <button
                  key={preset}
                  disabled={emergencyActive}
                  onClick={() => setEmergencyInput(preset)}
                  className={cn(
                    'text-left px-4 py-3 rounded-xl text-sm transition-colors',
                    emergencyActive
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-red-950/40 hover:border-red-800 border border-gray-700 text-gray-300 hover:text-red-300 cursor-pointer',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 자막 수기 입력 탭 ── */}
      {tab === 'subtitle' && (
        <div className="space-y-6">

          {/* 현재 송출 중 */}
          <div className={cn(
            'rounded-2xl border p-5',
            liveSubtitle ? 'bg-yellow-950/40 border-yellow-600' : 'bg-gray-900 border-gray-800',
          )}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">현재 송출 중</h2>
              {/* 항상 표시 — 페이지 새로고침 후에도 즉시 중지 가능 */}
              <button
                onClick={clearSubtitle}
                className="text-xs px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer transition-colors shrink-0"
              >
                ✕ 자막 전송 중지
              </button>
            </div>
            {liveSubtitle ? (
              <p className="text-xl font-bold text-yellow-300">📡 {liveSubtitle}</p>
            ) : (
              <p className="text-gray-600">송출 중인 자막 없음</p>
            )}
          </div>

          {/* 자막 직접 입력 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">직접 입력</h2>
            <textarea
              value={subtitleInput}
              onChange={(e) => setSubtitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSubtitle(); }
              }}
              placeholder="전광판 하단에 표시할 안내 문구 입력… (Enter → 즉시 전송)"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors resize-none text-lg"
            />
            <button
              onClick={sendSubtitle}
              disabled={!subtitleInput.trim()}
              className="w-full py-3 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-black text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              📺 전광판 자막 전송
            </button>
          </div>

          {/* 자주 쓰는 문구 (다중 선택 + 수정) */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">자주 쓰는 문구</h2>
              <span className="text-xs text-gray-600">체크 후 한 번에 전송 가능</span>
            </div>

            <div className="space-y-2">
              {presets.map((preset, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-xl overflow-hidden border transition-colors',
                    selected.has(idx)
                      ? 'bg-yellow-950/40 border-yellow-600'
                      : 'bg-gray-800 border-transparent',
                  )}
                >
                  {editingIdx === idx ? (
                    /* 수정 모드 */
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePreset(idx, editingText.trim() || preset);
                          if (e.key === 'Escape') setEditingIdx(null);
                        }}
                        className="flex-1 bg-gray-700 border border-yellow-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => savePreset(idx, editingText.trim() || preset)}
                        className="text-xs px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-bold cursor-pointer shrink-0"
                      >저장</button>
                      <button
                        onClick={() => setEditingIdx(null)}
                        className="text-xs px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg cursor-pointer shrink-0"
                      >취소</button>
                    </div>
                  ) : (
                    /* 일반 모드 */
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* 체크박스 */}
                      <button
                        onClick={() => toggleSelect(idx)}
                        className={cn(
                          'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors cursor-pointer',
                          selected.has(idx)
                            ? 'bg-yellow-500 border-yellow-500'
                            : 'border-gray-600 hover:border-yellow-500',
                        )}
                      >
                        {selected.has(idx) && <span className="text-black text-xs font-black">✓</span>}
                      </button>

                      <span
                        onClick={() => toggleSelect(idx)}
                        className="flex-1 text-sm text-gray-200 truncate cursor-pointer select-none"
                      >
                        {preset}
                      </span>

                      {/* 단독 전송 */}
                      <button
                        onClick={() => { emitSubtitle(preset); setLiveSubtitle(preset); setSelected(new Set()); }}
                        className="text-xs px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-bold cursor-pointer shrink-0"
                      >전송</button>

                      {/* 수정 */}
                      <button
                        onClick={() => { setEditingIdx(idx); setEditingText(preset); }}
                        className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white rounded-lg cursor-pointer shrink-0"
                      >수정</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 선택 전송 버튼 */}
            {selected.size >= 2 && (
              <button
                onClick={sendSelected}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-sm rounded-xl cursor-pointer transition-colors"
              >
                📺 선택한 {selected.size}개 동시 전송
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
