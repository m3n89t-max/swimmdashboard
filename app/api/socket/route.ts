import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

// Next.js App Router에서 Socket.io는 custom server 방식 필요
// 이 라우트는 연결 상태 확인용 엔드포인트
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: 'Socket.io 서버는 server.ts에서 실행됩니다.' });
}

// Socket.io 서버 싱글턴 (server.ts에서 초기화)
declare global {
  var _io: SocketServer | undefined;
  var _httpServer: HTTPServer | undefined;
}
