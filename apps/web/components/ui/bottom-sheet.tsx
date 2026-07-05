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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px]',
          'bg-bg-surface rounded-t-[2rem]',
          'shadow-2xl animate-slide-up',
          'max-h-[90dvh] overflow-hidden flex flex-col',
          className,
        )}
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab">
          <div className="h-1.5 w-12 rounded-full bg-bg-elevated/50" />
        </div>

        {title && (
          <h2 className="text-white text-xl font-bold text-center mb-4 tracking-tight px-6">
            {title}
          </h2>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col">{children}</div>
      </div>
    </div>
  );
}
