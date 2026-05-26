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

  globalThis._io = io;

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

    socket.on('announcer:play', (text: string) => {
      socket.broadcast.emit('announcer:play', text);
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
