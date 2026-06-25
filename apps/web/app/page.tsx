'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { APP_VERSION } from '@/lib/version';

export default function Home() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
    if (hydrated && token) {
      router.replace('/dashboard');
    }
  }, [hydrated, token, router]);

  // Enquanto hidrata ou se tem token (vai redirecionar), mostra loading
  if (!hydrated || token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-base">
        <span className="material-symbols-outlined text-4xl text-text-muted animate-spin">
          progress_activity
        </span>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 relative overflow-hidden">
      {/* Glow effect behind icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-primary/30 bg-primary/10">
          <span className="material-symbols-outlined text-primary text-5xl">bolt</span>
        </div>
      </div>

      <h1 className="font-bold text-[56px] leading-none text-primary tracking-tight">
        ENDURA
      </h1>
      <p className="text-text-secondary text-sm uppercase tracking-[0.2em] mt-3">
        Performance para triatletas
      </p>

      <div className="mt-12">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98]"
        >
          Entrar
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </Link>
      </div>

      {/* Version */}
      <p className="absolute bottom-8 text-xs text-text-faint font-[var(--font-mono)]">
        v{APP_VERSION}
      </p>
    </main>
  );
}
