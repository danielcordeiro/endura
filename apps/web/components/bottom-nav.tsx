'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Activity, UtensilsCrossed, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', label: 'Hoje', icon: Home },
  { href: '/treino', label: 'Plano', icon: Calendar },
  { href: '/atividades', label: 'Atividade', icon: Activity },
  { href: '/nutricao', label: 'Nutricao', icon: UtensilsCrossed },
  { href: '/configuracoes', label: 'Perfil', icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-elevated border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px]',
                'transition-colors duration-150',
                isActive ? 'text-primary' : 'text-text-muted',
              )}
            >
              <Icon size={22} />
              {isActive && (
                <span className="font-body text-[10px] font-medium">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
