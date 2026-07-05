'use client';

import { cn } from '@/lib/utils';

interface StepperProps {
  value: number | string;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange?: (value: string) => void;
  size?: 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const sizeStyles = {
  md: 'h-12',
  lg: 'h-14',
};

/** Pílula com −/+ para quantidades (extraído do padrão repetido em formulários de nutrição). */
export function Stepper({
  value,
  onIncrement,
  onDecrement,
  onChange,
  size = 'lg',
  className,
  'aria-label': ariaLabel,
}: StepperProps) {
  return (
    <div
      className={cn(
        'flex items-center bg-bg-elevated rounded-full border border-border-strong/50 overflow-hidden',
        sizeStyles[size],
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Diminuir${ariaLabel ? ` ${ariaLabel}` : ''}`}
        className="flex items-center justify-center w-12 h-full text-text-secondary hover:text-text-primary active:scale-90 transition-all"
      >
        <span className="material-symbols-outlined text-xl">remove</span>
      </button>
      {onChange ? (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className="flex-1 h-full min-w-0 text-center bg-transparent text-text-primary font-[var(--font-mono)] text-lg font-bold outline-none"
        />
      ) : (
        <span className="flex-1 text-center text-text-primary font-[var(--font-mono)] text-lg font-bold">
          {value}
        </span>
      )}
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Aumentar${ariaLabel ? ` ${ariaLabel}` : ''}`}
        className="flex items-center justify-center w-12 h-full text-text-secondary hover:text-text-primary active:scale-90 transition-all"
      >
        <span className="material-symbols-outlined text-xl">add</span>
      </button>
    </div>
  );
}
