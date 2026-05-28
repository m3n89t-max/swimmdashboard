import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import type { Heat, DisplayMode, RecordUpdatePayload } from './types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true);
    handle(req, res, parsedUrl);
  });

  // ── Socket.io 초기화 ─────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] 연결: ${socket.id}`);

    // 조작부 → 전광판
    socket.on('heat:activate', (heat: Heat) => {
      socket.broadcast.emit('heat:activate', heat);
    });

    socket.on('record:update', (payload: RecordUpdatePayload) => {
      socket.broadcast.emit('record:update', payload);
    });

    socket.on('display:mode', (mode: DisplayMode) => {
      socket.broadcast.emit('display:mode', mode);
    });

    // 경기 진행용 TTS (남성 중후한 목소리)
    socket.on('announcer:play', (text: string) => {
      socket.broadcast.emit('announcer:play', text);
    });

    // 긴급 공지용 TTS (여성 선명한 목소리) — 별도 채널
    socket.on('announcer:emergency', (text: string) => {
      socket.broadcast.emit('announcer:emergency', text);
    });

    socket.on('announcer:stop', () => {
      io.emit('announcer:stop');
    });

    socket.on('subtitle:update', (text: string) => {
      socket.broadcast.emit('subtitle:update', text);
    });

    // ── 배경 음악 ─────────────────────────────────────────────────────────────
    socket.on('music:load', (data: { src: string; volume: number }) => {
      socket.broadcast.emit('music:load', data);
    });
    socket.on('music:play', () => { socket.broadcast.emit('music:play'); });
    socket.on('music:pause', () => { socket.broadcast.emit('music:pause'); });
    socket.on('music:stop', () => { socket.broadcast.emit('music:stop'); });
    socket.on('music:volume', (vol: number) => { socket.broadcast.emit('music:volume', vol); });
    socket.on('music:duck', (vol: number) => { socket.broadcast.emit('music:duck', vol); });

    // 긴급 팝업
    socket.on('emergency:show', (text: string) => {
      io.emit('emergency:show', text);   // 조작부 포함 전체 전송
    });

    socket.on('emergency:hide', () => {
      io.emit('emergency:hide');
    });

    // 전광판 → 조작부
    socket.on('display:ready', () => {
      socket.broadcast.emit('display:ready');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 해제: ${socket.id}`);
    });
  });

  const PORT = Number(process.env.PORT ?? 3001);
  httpServer.listen(PORT, () => {
    console.log(`\n🏊 수영대회 전광판 서버 시작: http://localhost:${PORT}`);
    console.log(`   조작부: http://localhost:${PORT}/admin`);
    console.log(`   전광판: http://localhost:${PORT}/display\n`);
  });
});
