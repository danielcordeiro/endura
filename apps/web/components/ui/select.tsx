'use client';

import { forwardRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import type { FieldSize } from './input';

const sizeStyles: Record<FieldSize, string> = {
  lg: 'h-14 px-5 rounded-2xl bg-bg-surface text-[15px]',
  md: 'h-12 px-4 rounded-xl bg-bg-input text-[15px]',
  sm: 'h-11 px-3.5 rounded-xl bg-bg-input text-sm',
};

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  size?: FieldSize;
}

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, size = 'md', children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'w-full inline-flex items-center justify-between gap-2 border text-text-primary',
      'transition-colors duration-150 outline-none',
      'focus:ring-2 focus:ring-primary/20 focus:border-primary',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      'data-[placeholder]:text-text-muted',
      'border-border-strong/50',
      sizeStyles[size],
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <span className="material-symbols-outlined text-lg text-text-muted shrink-0">expand_more</span>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', sideOffset = 4, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        'z-[60] overflow-hidden rounded-xl border border-hairline bg-bg-surface shadow-lg animate-fade-in',
        position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-primary',
      'cursor-pointer select-none outline-none',
      'data-[highlighted]:bg-bg-elevated',
      'data-[state=checked]:text-primary data-[state=checked]:font-semibold',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
