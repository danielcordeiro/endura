'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-bg-elevated rounded-t-xl',
          'animate-slide-up',
          'max-h-[85vh] overflow-y-auto',
          className,
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {title && (
          <h2 className="font-heading font-semibold text-[22px] text-text-primary px-4 pb-3">
            {title}
          </h2>
        )}

        <div className="px-4 pb-8">{children}</div>
      </div>
    </div>
  );
}
