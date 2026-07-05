'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full bg-bg-input border rounded-xl px-4 py-3 text-[15px] text-text-primary',
          'placeholder:text-text-muted resize-none',
          'transition-colors duration-150 outline-none',
          'focus:ring-2 focus:ring-primary/20',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-border-strong/50 focus:border-primary',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
