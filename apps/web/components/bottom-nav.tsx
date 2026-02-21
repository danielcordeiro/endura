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
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 w-16 py-1.5',
                'transition-all duration-200',
                isActive ? 'text-primary' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-full" />
              )}
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span
                className={cn(
                  'font-body text-[10px] leading-none tracking-wide',
                  isActive ? 'font-semibold' : 'font-medium opacity-70',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
