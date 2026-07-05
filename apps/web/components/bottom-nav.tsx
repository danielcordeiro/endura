'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isBottomNavHidden } from '@/lib/nav-visibility';

const tabs = [
  { href: '/dashboard', label: 'Início', icon: 'home' },
  { href: '/atividades', label: 'Atividades', icon: 'directions_run' },
  { href: '/treino', label: 'Treino', icon: 'fitness_center' },
  { href: '/nutricao', label: 'Nutrição', icon: 'restaurant' },
  { href: '/configuracoes', label: 'Perfil', icon: 'person' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (isBottomNavHidden(pathname)) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="glass-nav fixed bottom-0 left-0 right-0 z-40 px-2 pt-1.5"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch justify-between max-w-sm mx-auto w-full">
        {tabs.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors',
                isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {/* indicador ativo */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -top-1.5 h-1 w-1 rounded-full bg-primary transition-all duration-300',
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'material-symbols-outlined text-[24px] transition-transform duration-200',
                  isActive ? 'scale-105' : 'group-hover:scale-110 group-active:scale-95',
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : undefined}
              >
                {icon}
              </span>
              <span className={cn('text-[10px] tracking-wide', isActive ? 'font-semibold' : 'font-medium')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
