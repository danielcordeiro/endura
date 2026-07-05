'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'strava';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-10 px-5 text-[13px]',
  md: 'h-12 px-6 text-[14px]',
  lg: 'h-14 px-6 text-[14px]',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary text-white font-bold',
    'shadow-lg shadow-primary/25',
    'hover:bg-primary-hover',
    'active:scale-[0.98]',
  ].join(' '),
  secondary: [
    'bg-bg-surface border border-border-strong/50 text-text-primary',
    'hover:bg-bg-elevated',
    'active:scale-[0.98]',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary',
    'hover:bg-white/5 hover:text-text-primary',
    'active:scale-[0.98]',
  ].join(' '),
  danger: [
    'bg-transparent text-danger border border-danger/30',
    'hover:bg-danger/10 hover:border-danger/50',
    'active:scale-[0.98]',
  ].join(' '),
  strava: [
    'bg-strava text-white font-bold',
    'shadow-lg shadow-strava/25',
    'hover:brightness-110',
    'active:scale-[0.98]',
  ].join(' '),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-semibold tracking-wide rounded-full',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none',
          fullWidth && 'w-full',
          sizeStyles[size],
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
