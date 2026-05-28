'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface MusicPlayerHandle {
  load: (src: string, volume: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (vol: number) => void;
  duck: (vol: number) => void;
}

const MusicPlayer = forwardRef<MusicPlayerHandle>(function MusicPlayer(_, ref) {
  const iframeRef        = useRef<HTMLIFrameElement>(null);
  const [src, setSrc]    = useState('');
  const [muted, setMuted] = useState(true);    // 기기별 독립 음소거 (기본: 뮤트)
  const volumeRef        = useRef(70);          // 현재 볼륨 기억
  const isPlayingRef     = useRef(false);

  /** postMessage → YouTube IFrame API 명령 */
  const ytCmd = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    );
  };

  // src 변경 시 1.5초 후 볼륨 적용
  useEffect(() => {
    if (!src) return;
    const t = setTimeout(() => {
      if (muted) ytCmd('mute');
      else ytCmd('setVolume', [volumeRef.current]);
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const applyMute = (m: boolean) => {
    if (m) {
      ytCmd('mute');
    } else {
      ytCmd('unMute');
      ytCmd('setVolume', [volumeRef.current]);
      // 음소거 해제 시 재생 중이 아니면 시작
      if (!isPlayingRef.current) {
        ytCmd('playVideo');
        isPlayingRef.current = true;
      }
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    applyMute(next);
  };

  useImperativeHandle(ref, () => ({
    load(newSrc: string, volume: number) {
      volumeRef.current  = volume;
      isPlayingRef.current = false;
      setSrc(newSrc);
      setMuted(true);    // 새 곡 로드 시 항상 뮤트 상태로 시작
    },
    play() {
      ytCmd('playVideo');
      isPlayingRef.current = true;
      if (!muted) ytCmd('setVolume', [volumeRef.current]);
    },
    pause() {
      ytCmd('pauseVideo');
      isPlayingRef.current = false;
    },
    stop() {
      ytCmd('stopVideo');
      isPlayingRef.current = false;
      setSrc('');
    },
    setVolume(vol: number) {
      volumeRef.current = vol;
      if (!muted) ytCmd('setVolume', [vol]);
    },
    duck(vol: number) {
      if (!muted) ytCmd('setVolume', [vol]);
    },
  }));

  return (
    <>
      {/* 숨겨진 YouTube iframe — 오디오만 */}
      {src && (
        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          allow="autoplay; encrypted-media"
          className="absolute pointer-events-none"
          style={{ width: 1, height: 1, left: -9999, top: -9999, opacity: 0 }}
          title="music-player"
        />
      )}

      {/* 🔇/🔊 음소거 토글 — 전광판 화면 좌하단 */}
      {src && (
        <button
          onClick={toggleMute}
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2
                     bg-black/60 hover:bg-black/80 border border-white/20
                     rounded-full px-4 py-2 text-white text-sm font-bold
                     cursor-pointer transition-all backdrop-blur-sm"
          title={muted ? '음악 켜기' : '음악 끄기'}
        >
          <span className="text-lg">{muted ? '🔇' : '🔊'}</span>
          <span className="text-xs text-white/70">{muted ? '음악 켜기' : '음악 끄기'}</span>
        </button>
      )}
    </>
  );
});

export default MusicPlayer;
