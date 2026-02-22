'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', label: 'Início', icon: 'home' },
  { href: '/treino', label: 'Treino', icon: 'fitness_center' },
  { href: '/nutricao', label: 'Nutrição', icon: 'restaurant' },
  { href: '/configuracoes', label: 'Perfil', icon: 'person' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#283139] bg-[#1c2227]/95 backdrop-blur-lg px-4 pb-6 pt-2">
      <div className="flex items-center justify-between max-w-sm mx-auto w-full">
        {tabs.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 group transition-colors',
                isActive ? 'text-primary' : 'text-[#9dacb9] hover:text-white',
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[24px] transition-transform',
                  !isActive && 'group-hover:scale-110',
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : undefined}
              >
                {icon}
              </span>
              <span className="text-[10px] font-medium tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
