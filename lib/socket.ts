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

export function emitAnnouncerPlay(text: string) {
  getSocket().emit('announcer:play', text);
}
