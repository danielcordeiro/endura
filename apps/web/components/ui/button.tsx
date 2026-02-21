'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'strava';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-inverse hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-transparent border border-border text-text-primary hover:bg-bg-elevated active:scale-[0.98]',
  ghost:
    'bg-transparent text-text-primary hover:bg-bg-surface active:scale-[0.98]',
  danger:
    'bg-danger text-white hover:brightness-110 active:scale-[0.98]',
  strava:
    'bg-strava text-white hover:brightness-110 active:scale-[0.98]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, fullWidth, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-body font-semibold text-[15px] uppercase tracking-wider',
          'h-[52px] px-6 rounded-md',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          'disabled:opacity-35 disabled:cursor-not-allowed disabled:scale-100',
          fullWidth && 'w-full',
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
