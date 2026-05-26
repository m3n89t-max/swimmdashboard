'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/upload', label: '대진표 업로드', icon: '📂' },
  { href: '/admin/control', label: '경기 진행', icon: '🏊' },
  { href: '/admin/announcer', label: 'AI 아나운서', icon: '🎙️' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <span className="text-xl font-black text-cyan-400 shrink-0 mr-4">🏊 수영대회 운영</span>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150',
            pathname === item.href
              ? 'bg-cyan-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800',
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {/* 전광판 열기 버튼 */}
      <div className="ml-auto">
        <a
          href="/display"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors duration-150"
        >
          <span>📺</span>
          전광판 열기
        </a>
      </div>
    </nav>
  );
}
