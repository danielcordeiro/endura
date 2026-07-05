'use client';

import { cn } from '@/lib/utils';

type AlertVariant = 'warning' | 'success' | 'danger' | 'info';

interface AlertBannerProps {
  variant: AlertVariant;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: string; textColor: string }> = {
  warning: { bg: 'bg-warning/10', border: 'border-warning/20', icon: 'warning', textColor: 'text-warning' },
  success: { bg: 'bg-success/10', border: 'border-success/20', icon: 'check_circle', textColor: 'text-success' },
  danger: { bg: 'bg-danger/10', border: 'border-danger/20', icon: 'error', textColor: 'text-danger' },
  info: { bg: 'bg-info/10', border: 'border-info/20', icon: 'info', textColor: 'text-info' },
};

export function AlertBanner({ variant, children, action, className }: AlertBannerProps) {
  const { bg, border, icon, textColor } = variantStyles[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 border',
        bg,
        border,
        className,
      )}
    >
      <span className={cn('material-symbols-outlined shrink-0', textColor)} aria-hidden="true">{icon}</span>
      <div className={cn('flex-1 text-sm font-medium', textColor)}>{children}</div>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors',
            `${bg} ${textColor} hover:brightness-125`,
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
