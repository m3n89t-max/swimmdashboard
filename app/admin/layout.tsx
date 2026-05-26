import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: '수영대회 운영 조작부',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <AdminNav />
      <main className="flex-1 container mx-auto px-6 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
