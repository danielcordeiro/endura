'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Aguarda o Zustand persist hidratar do localStorage
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  // Enquanto não hidratou ou não tem token, mostra loading
  if (!hydrated || !token) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-text-faint animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
