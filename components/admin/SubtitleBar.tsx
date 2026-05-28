'use client';

import { useState, useCallback } from 'react';
import { emitSubtitle } from '@/lib/socket';

export default function SubtitleBar() {
  const [input, setInput] = useState('');
  const [live, setLive] = useState('');

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    emitSubtitle(text);
    setLive(text);
    setInput('');
  }, [input]);

  const clear = useCallback(() => {
    emitSubtitle('');
    setLive('');
    setInput('');
  }, []);

  return (
    <div className="border-t border-gray-800 bg-gray-950 px-6 py-2.5 flex items-center gap-3 shrink-0">
      {/* 라벨 */}
      <span className="text-xs font-bold text-yellow-500 shrink-0 tracking-wider">
        📺 자막
      </span>

      {/* 입력창 */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder="전광판 자막 입력 후 Enter…"
        className="flex-1 bg-gray-800 border border-gray-700 focus:border-yellow-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
      />

      {/* 전송 버튼 */}
      <button
        onClick={send}
        disabled={!input.trim()}
        className="text-xs px-4 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold cursor-pointer disabled:cursor-not-allowed transition-colors shrink-0"
      >
        전송
      </button>

      {/* 현재 송출 중 표시 + 지우기 */}
      {live ? (
        <>
          <span className="text-xs text-yellow-400 shrink-0 max-w-56 truncate">
            📡 {live}
          </span>
          <button
            onClick={clear}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white rounded-lg font-bold cursor-pointer transition-colors shrink-0"
          >
            지우기
          </button>
        </>
      ) : (
        <span className="text-xs text-gray-700 shrink-0">송출 없음</span>
      )}
    </div>
  );
}
