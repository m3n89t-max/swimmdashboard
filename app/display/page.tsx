'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getSocket } from '@/lib/socket';
import type { Heat, DisplayMode, RecordUpdatePayload } from '@/types';
import ResultsBoard from '@/components/display/ResultsBoard';
import WaitingBoard from '@/components/display/WaitingBoard';
import ReadyBoard from '@/components/display/ReadyBoard';
import StandbyBoard from '@/components/display/StandbyBoard';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('display:ready');

    socket.on('heat:activate', (heat: Heat) => {
      setCurrentHeat(heat);
    });

    socket.on('record:update', (payload: RecordUpdatePayload) => {
      updateRecord(payload.lane, payload.record, payload.rank, payload.status);
    });

    socket.on('display:mode', (mode: DisplayMode) => {
      setDisplayMode(mode);
    });

    socket.on('announcer:play', (base64: string) => {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = `data:audio/mp3;base64,${base64}`;
      audioRef.current.play().catch(() => {});
    });

    // 다음 대기 조 로드
    fetch('/api/events')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const pending = res.data
            .filter((e: Heat) => e.status === 'pending')
            .slice(0, 3);
          setNextHeats(pending);
        }
      })
      .catch(console.error);

    return () => {
      socket.off('heat:activate');
      socket.off('record:update');
      socket.off('display:mode');
      socket.off('announcer:play');
    };
  }, [setCurrentHeat, setNextHeats, updateRecord, setDisplayMode]);

  return (
    <main className="h-screen w-screen flex flex-col font-['Noto_Sans_KR']">
      {displayMode === 'results' && currentHeat && (
        <ResultsBoard heat={currentHeat} />
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
    </main>
  );
}
