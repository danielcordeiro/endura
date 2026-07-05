'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type FieldSize = 'sm' | 'md' | 'lg';

const sizeStyles: Record<FieldSize, string> = {
  lg: 'h-14 px-5 rounded-2xl bg-bg-surface text-[15px]',
  md: 'h-12 px-4 rounded-xl bg-bg-input text-[15px]',
  sm: 'h-11 px-3.5 rounded-xl bg-bg-input text-sm',
};

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: FieldSize;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full border text-text-primary placeholder:text-text-muted',
          'transition-colors duration-150 outline-none',
          'focus:ring-2 focus:ring-primary/20',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-border-strong/50 focus:border-primary',
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
