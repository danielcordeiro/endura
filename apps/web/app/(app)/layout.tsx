'use client';

import { BottomNav } from '@/components/bottom-nav';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh overflow-x-clip">
        <main
          className="pt-[max(env(safe-area-inset-top),1rem)] max-w-lg mx-auto"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
