'use client';

import { BottomNav } from '@/components/bottom-nav';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh pb-24">
        <main className="px-5 pt-[env(safe-area-inset-top)] max-w-lg mx-auto">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
