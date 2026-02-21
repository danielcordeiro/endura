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
  primary: [
    'bg-primary text-text-inverse font-bold',
    'shadow-[0_2px_12px_rgba(0,245,196,0.25)]',
    'hover:brightness-110 hover:shadow-[0_2px_20px_rgba(0,245,196,0.35)]',
    'active:scale-[0.97] active:shadow-[0_1px_8px_rgba(0,245,196,0.2)]',
  ].join(' '),
  secondary: [
    'bg-bg-surface border border-border text-text-primary',
    'shadow-[0_1px_3px_rgba(0,0,0,0.2)]',
    'hover:bg-bg-elevated hover:border-text-muted/30',
    'active:scale-[0.97]',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary',
    'hover:bg-bg-surface hover:text-text-primary',
    'active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-danger/15 text-danger border border-danger/25',
    'hover:bg-danger/25',
    'active:scale-[0.97]',
  ].join(' '),
  strava: [
    'bg-strava text-white font-bold',
    'shadow-[0_2px_12px_rgba(252,76,2,0.25)]',
    'hover:brightness-110 hover:shadow-[0_2px_20px_rgba(252,76,2,0.35)]',
    'active:scale-[0.97]',
  ].join(' '),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, fullWidth, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-body font-semibold text-[14px] uppercase tracking-[0.06em]',
          'h-12 px-6 rounded-xl',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none',
          fullWidth && 'w-full',
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
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
