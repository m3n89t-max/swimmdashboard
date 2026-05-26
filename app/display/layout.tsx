import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '수영대회 전광판',
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden select-none">
      {children}
    </div>
  );
}
