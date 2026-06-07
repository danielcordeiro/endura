import { cn } from '@/lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, action, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3 px-1', className)}>
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
        {children}
      </h2>
      {action}
    </div>
  );
}
