'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { AuthGuard } from '@/components/auth-guard';
import { isBottomNavHidden } from '@/lib/nav-visibility';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Nas rotas onde a bottom nav global fica escondida, a própria página reserva
  // o espaço do seu rodapé fixo — o shell não deve somar os 120px da nav por cima.
  const navHidden = isBottomNavHidden(pathname);

  return (
    <AuthGuard>
      <div className="min-h-dvh overflow-x-clip">
        <main
          className="pt-[max(env(safe-area-inset-top),1rem)] max-w-lg mx-auto"
          style={{
            paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
            paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
            paddingBottom: navHidden
              ? 'max(1.5rem, env(safe-area-inset-bottom))'
              : 'calc(120px + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
