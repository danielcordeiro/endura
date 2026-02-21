'use client';

import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'warning' | 'success' | 'danger' | 'info';

interface AlertBannerProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: typeof Info }> = {
  warning: { bg: 'bg-warning-dim', border: 'border-l-warning', icon: AlertTriangle },
  success: { bg: 'bg-success-dim', border: 'border-l-success', icon: CheckCircle },
  danger: { bg: 'bg-danger-dim', border: 'border-l-danger', icon: XCircle },
  info: { bg: 'bg-info/12', border: 'border-l-info', icon: Info },
};

export function AlertBanner({ variant, children, className }: AlertBannerProps) {
  const { bg, border, icon: Icon } = variantStyles[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 px-4',
        'border-l-3',
        bg,
        border,
        className,
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0 opacity-80" />
      <div className="font-body text-[14px] text-text-primary">{children}</div>
    </div>
  );
}
