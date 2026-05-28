import { io, Socket } from 'socket.io-client';
import type { Heat, DisplayMode, RecordUpdatePayload } from '@/types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

// ─── 조작부에서 호출하는 emit 헬퍼 ────────────────────────────────────────────

export function emitHeatActivate(heat: Heat) {
  getSocket().emit('heat:activate', heat);
}

export function emitRecordUpdate(payload: RecordUpdatePayload) {
  getSocket().emit('record:update', payload);
}

export function emitDisplayMode(mode: DisplayMode) {
  getSocket().emit('display:mode', mode);
}

/** 경기 진행용 방송 (남성 중후한 목소리) */
export function emitAnnouncerPlay(text: string) {
  getSocket().emit('announcer:play', text);
}

/** 긴급 공지용 방송 (여성 선명한 목소리) — 별도 채널 */
export function emitAnnouncerEmergency(text: string) {
  getSocket().emit('announcer:emergency', text);
}

export function emitSubtitle(text: string) {
  getSocket().emit('subtitle:update', text);
}

export function emitEmergency(text: string) {
  getSocket().emit('emergency:show', text);
}

export function emitEmergencyHide() {
  getSocket().emit('emergency:hide');
}

export function emitAnnouncerStop() {
  getSocket().emit('announcer:stop');
}

// ─── 배경 음악 ────────────────────────────────────────────────────────────────

export function emitMusicLoad(src: string, volume: number) {
  getSocket().emit('music:load', { src, volume });
}
export function emitMusicPlay() { getSocket().emit('music:play'); }
export function emitMusicPause() { getSocket().emit('music:pause'); }
export function emitMusicStop() { getSocket().emit('music:stop'); }
export function emitMusicVolume(vol: number) { getSocket().emit('music:volume', vol); }
export function emitMusicDuck(vol: number) { getSocket().emit('music:duck', vol); }
