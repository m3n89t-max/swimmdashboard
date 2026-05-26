'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Heat } from '@/types';

export default function AdminDashboard() {
  const [heats, setHeats] = useState<Heat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setHeats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = heats.length;
  const completed = heats.filter((h) => h.status === 'completed').length;
  const active = heats.filter((h) => h.status === 'active').length;
  const pending = heats.filter((h) => h.status === 'pending').length;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-white">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체 조', value: total, color: 'text-white', bg: 'bg-gray-800' },
          { label: '진행 중', value: active, color: 'text-cyan-400', bg: 'bg-cyan-950' },
          { label: '대기', value: pending, color: 'text-yellow-300', bg: 'bg-yellow-950' },
          { label: '완료', value: completed, color: 'text-green-400', bg: 'bg-green-950' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-6 border border-gray-800`}>
            <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
            <p className={`text-5xl font-black ${stat.color}`}>
              {loading ? '…' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* 진행률 바 */}
      {total > 0 && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-semibold text-gray-400">전체 진행률</span>
            <span className="text-sm font-bold text-white">
              {completed}/{total} 조
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 빠른 이동 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/upload"
          className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-3 transition-colors group"
        >
          <span className="text-4xl">📂</span>
          <span className="text-xl font-bold text-white">대진표 업로드</span>
          <span className="text-sm text-gray-400">엑셀 파일로 선수 명단을 등록합니다</span>
        </Link>
        <Link
          href="/admin/control"
          className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-3 transition-colors group"
        >
          <span className="text-4xl">🏊</span>
          <span className="text-xl font-bold text-white">경기 진행</span>
          <span className="text-sm text-gray-400">기록 입력 및 전광판 제어</span>
        </Link>
        <Link
          href="/admin/announcer"
          className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-3 transition-colors group"
        >
          <span className="text-4xl">🎙️</span>
          <span className="text-xl font-bold text-white">AI 아나운서</span>
          <span className="text-sm text-gray-400">Claude AI 방송 멘트 생성 및 재생</span>
        </Link>
      </div>

      {/* 최근 경기 목록 */}
      {heats.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">경기 목록</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
            {heats.slice(0, 20).map((heat) => (
              <div key={heat.id} className="flex items-center gap-4 px-6 py-3">
                <span className="text-sm text-gray-500 w-16 shrink-0">
                  제{heat.eventNo}종목
                </span>
                <span className="flex-1 font-semibold text-white">
                  {heat.eventName} ({heat.heatNo}조)
                </span>
                <span className="text-sm text-gray-400">{heat.category}</span>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${
                    heat.status === 'active'
                      ? 'bg-cyan-900 text-cyan-300'
                      : heat.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {heat.status === 'active'
                    ? '진행 중'
                    : heat.status === 'completed'
                    ? '완료'
                    : '대기'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 대진표 없을 때 */}
      {!loading && heats.length === 0 && (
        <div className="bg-gray-900 rounded-2xl border border-dashed border-gray-700 p-16 text-center">
          <p className="text-2xl text-gray-500 mb-4">대진표가 없습니다.</p>
          <Link
            href="/admin/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
          >
            📂 엑셀 업로드하러 가기
          </Link>
        </div>
      )}
    </div>
  );
}
