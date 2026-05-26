import { NextResponse } from 'next/server';

// Socket.io는 server.ts 커스텀 서버에서 실행됩니다.
// 이 라우트는 연결 상태 확인용 엔드포인트입니다.
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Socket.io 서버는 server.ts에서 실행됩니다.' });
}
