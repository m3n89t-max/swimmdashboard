'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getSocket } from '@/lib/socket';
import { speakRace, speakEmergency, stopSpeech } from '@/lib/tts';
import type { Heat, DisplayMode, RecordUpdatePayload } from '@/types';
import ResultsBoard from '@/components/display/ResultsBoard';
import WaitingBoard from '@/components/display/WaitingBoard';
import ReadyBoard from '@/components/display/ReadyBoard';
import StandbyBoard from '@/components/display/StandbyBoard';
import EmergencyPopup from '@/components/display/EmergencyPopup';
import MusicPlayer, { type MusicPlayerHandle } from '@/components/display/MusicPlayer';

export default function DisplayPage() {
  const {
    currentHeat,
    nextHeats,
    displayMode,
    setCurrentHeat,
    setNextHeats,
    updateRecord,
    setDisplayMode,
  } = useGameStore();

  const [subtitle, setSubtitle] = useState('');
  const [emergency, setEmergency] = useState('');
  const musicRef = useRef<MusicPlayerHandle>(null);
  const musicVolumeRef = useRef(70);          // 현재 볼륨 기억 (오토덕킹 복구용)
  const duckTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 기기별 독립 안내음성 음소거 (기본: 뮤트 — TV에서만 켜기)
  const ttsMutedRef = useRef<boolean>(true);
  const [ttsMuted, setTtsMuted] = useState(true);

  // localStorage에서 TTS 뮤트 설정 복원 (클라이언트 전용)
  useEffect(() => {
    const saved = localStorage.getItem('tts-muted');
    if (saved !== null) {
      const val = saved === 'true';
      ttsMutedRef.current = val;
      setTtsMuted(val);
    }
  }, []);

  const toggleTtsMute = () => {
    const next = !ttsMutedRef.current;
    ttsMutedRef.current = next;
    setTtsMuted(next);
    localStorage.setItem('tts-muted', String(next));
    // 음소거 ON 시 재생 중인 음성 즉시 중단
    if (next) stopSpeech();
  };

  /** pending 상태인 조를 eventNo → heatNo 순으로 정렬해서 최대 4개 가져오기 */
  const fetchNextHeats = useCallback(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const pending = (res.data as Heat[])
            .filter((e) => e.status === 'pending')
            .sort((a, b) =>
              a.eventNo !== b.eventNo
                ? a.eventNo - b.eventNo
                : a.heatNo - b.heatNo,
            )
            .slice(0, 4);
          setNextHeats(pending);
        }
      })
      .catch(console.error);
  }, [setNextHeats]);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('display:ready');

    socket.on('heat:activate', (heat: Heat) => {
      setCurrentHeat(heat);
      fetchNextHeats();
    });

    socket.on('record:update', (payload: RecordUpdatePayload) => {
      updateRecord(payload.lane, payload.record, payload.rank, payload.status);
    });

    socket.on('display:mode', (mode: DisplayMode) => {
      setDisplayMode(mode);
      if (mode === 'results' || mode === 'waiting') {
        fetchNextHeats();
      }
    });

    // 경기 진행 TTS — 남성 중후한 목소리 + 오토덕킹
    socket.on('announcer:play', (text: string) => {
      if (ttsMutedRef.current) return;          // 이 기기 뮤트 → 무시
      // 음악 볼륨 덕킹 (20% 로 감소)
      musicRef.current?.duck(20);
      if (duckTimerRef.current) clearTimeout(duckTimerRef.current);

      speakRace(text).catch(console.warn);

      // 텍스트 길이 기반 복구 타이머
      const restoreMs = Math.max(5000, Math.ceil(text.replace(/\s/g, '').length / 4) * 1000 + 3000);
      duckTimerRef.current = setTimeout(() => {
        musicRef.current?.setVolume(musicVolumeRef.current);
      }, restoreMs);
    });

    // 긴급 공지 TTS — 여성 선명한 목소리 + 오토덕킹
    socket.on('announcer:emergency', (text: string) => {
      if (ttsMutedRef.current) return;          // 이 기기 뮤트 → 무시
      musicRef.current?.duck(15);
      if (duckTimerRef.current) clearTimeout(duckTimerRef.current);
      speakEmergency(text).catch(console.warn);
      const restoreMs = Math.max(5000, Math.ceil(text.replace(/\s/g, '').length / 4) * 1000 + 3000);
      duckTimerRef.current = setTimeout(() => {
        musicRef.current?.setVolume(musicVolumeRef.current);
      }, restoreMs);
    });

    // 음성 즉시 멈춤 → 음악 볼륨도 즉시 복구
    socket.on('announcer:stop', () => {
      stopSpeech();
      if (duckTimerRef.current) clearTimeout(duckTimerRef.current);
      musicRef.current?.setVolume(musicVolumeRef.current);
    });

    // 자막
    socket.on('subtitle:update', (text: string) => { setSubtitle(text); });

    // 긴급 팝업
    socket.on('emergency:show', (text: string) => { setEmergency(text); });
    socket.on('emergency:hide', () => { setEmergency(''); });

    // ── 배경 음악 ──────────────────────────────────────────────────────────
    socket.on('music:load',   ({ src, volume }: { src: string; volume: number }) => {
      musicVolumeRef.current = volume;
      musicRef.current?.load(src, volume);
    });
    socket.on('music:play',   () => { musicRef.current?.play(); });
    socket.on('music:pause',  () => { musicRef.current?.pause(); });
    socket.on('music:stop',   () => { musicRef.current?.stop(); });
    socket.on('music:volume', (vol: number) => {
      musicVolumeRef.current = vol;
      musicRef.current?.setVolume(vol);
    });
    socket.on('music:duck',   (vol: number) => { musicRef.current?.duck(vol); });

    fetchNextHeats();

    return () => {
      socket.off('heat:activate');
      socket.off('record:update');
      socket.off('display:mode');
      socket.off('announcer:play');
      socket.off('announcer:emergency');
      socket.off('announcer:stop');
      socket.off('subtitle:update');
      socket.off('emergency:show');
      socket.off('emergency:hide');
      socket.off('music:load');
      socket.off('music:play');
      socket.off('music:pause');
      socket.off('music:stop');
      socket.off('music:volume');
      socket.off('music:duck');
    };
  }, [setCurrentHeat, setNextHeats, updateRecord, setDisplayMode, fetchNextHeats]);

  return (
    <main className="h-screen w-screen flex flex-col font-['Noto_Sans_KR'] relative">
      {/* 숨겨진 YouTube 음악 플레이어 */}
      <MusicPlayer ref={musicRef} />

      {/* 🔇/🔊 안내음성 토글 — 기기별 독립 (TV에서만 켜기) */}
      <button
        onClick={toggleTtsMute}
        className="fixed bottom-16 left-4 z-30 flex items-center gap-2
                   bg-black/60 hover:bg-black/80 border border-white/20
                   rounded-full px-4 py-2 text-white text-sm font-bold
                   cursor-pointer transition-all backdrop-blur-sm"
        title={ttsMuted ? '안내음성 켜기' : '안내음성 끄기'}
      >
        <span className="text-lg">{ttsMuted ? '🔇' : '🔊'}</span>
        <span className="text-xs text-white/70">{ttsMuted ? '안내음성' : '안내음성'}</span>
      </button>

      {/* 긴급 팝업 — 최상위 레이어 */}
      {emergency && <EmergencyPopup text={emergency} />}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-hidden">
        {displayMode === 'results' && currentHeat && (
          <ResultsBoard heat={currentHeat} nextHeats={nextHeats} />
        )}
        {displayMode === 'waiting' && (
          <WaitingBoard heats={nextHeats} />
        )}
        {displayMode === 'ready' && currentHeat && nextHeats[0] && (
          <ReadyBoard nextHeat={nextHeats[0]} />
        )}
        {(displayMode === 'standby' || (displayMode === 'results' && !currentHeat)) && (
          <StandbyBoard />
        )}
      </div>

      {/* 범례 푸터 */}
      {displayMode === 'results' && currentHeat && (
        <footer className="bg-gray-900 border-t border-gray-800 px-8 py-3 flex items-center gap-8 shrink-0">
          {[
            { color: 'bg-yellow-400', label: '🥇 1위' },
            { color: 'bg-slate-300',  label: '🥈 2위' },
            { color: 'bg-amber-600',  label: '🥉 3위' },
            { color: 'bg-green-400',  label: '기록' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${color} inline-block`} />
              <span className="text-lg text-gray-300">{label}</span>
            </div>
          ))}
          <div className="ml-auto text-lg text-gray-500">
            DNS: 출전 포기 · DQ: 실격 · DSQ: 자격 박탈
          </div>
        </footer>
      )}

      {/* 자막 티커 */}
      {subtitle && (
        <div className="overflow-hidden bg-black border-t-4 border-yellow-400 py-3 shrink-0">
          <span
            key={subtitle}
            className="inline-block whitespace-nowrap text-yellow-300 text-3xl font-black tracking-widest"
            style={{ animation: 'ticker 30s linear infinite' }}
          >
            ◆&nbsp;&nbsp;{subtitle}&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;{subtitle}&nbsp;&nbsp;◆
          </span>
        </div>
      )}
    </main>
  );
}
