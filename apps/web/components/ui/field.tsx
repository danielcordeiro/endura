'use client';

import { cn } from '@/lib/utils';
import { Label } from './label';

interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper padrão de campo: label -> controle -> hint/erro, com o
 * respiro do design system embutido (nunca precisa de space-y manual
 * por fora). label->controle usa mais espaço que controle->hint, pra
 * deixar clara a relação entre os dois pares.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="mb-2">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
