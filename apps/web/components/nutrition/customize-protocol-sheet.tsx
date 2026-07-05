'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ── Types ── */

interface ProtocolItem {
  phase: 'pre' | 'during' | 'post';
  minuteOffset?: number;
  productName: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  carbsG?: number;
  sodiumMg?: number;
  caffeineMg?: number;
  kcal?: number;
}

interface CustomizeProtocolSheetProps {
  protocolId: string;
  items: ProtocolItem[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const phaseOptions = [
  { value: 'pre', label: 'Pre' },
  { value: 'during', label: 'Durante' },
  { value: 'post', label: 'Pos' },
] as const;

/* ── Component ── */

export function CustomizeProtocolSheet({
  protocolId,
  items: initialItems,
  open,
  onClose,
  onSuccess,
}: CustomizeProtocolSheetProps) {
  const { token } = useAuthStore();

  const [items, setItems] = useState<ProtocolItem[]>(() =>
    initialItems.map((item) => ({ ...item })),
  );

  const mutation = useMutation({
    mutationFn: (payload: { items: ProtocolItem[] }) =>
      apiFetch(`/api/nutrition-planner/customize/${protocolId}`, {
        method: 'PUT',
        token: token ?? undefined,
        body: JSON.stringify(payload),
      }),
    onSuccess,
  });

  function updateItem(index: number, field: keyof ProtocolItem, value: unknown) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { phase: 'during' as const, minuteOffset: 0, productName: '', carbsG: 0, sodiumMg: 0, kcal: 0 },
    ]);
  }

  function handleSave() {
    const validItems = items.filter((item) => item.productName.trim());
    if (validItems.length === 0) return;
    mutation.mutate({ items: validItems });
  }

  // Sync items when sheet opens with new data
  if (open && initialItems !== items && initialItems.length > 0 && items.length === 0) {
    setItems(initialItems.map((item) => ({ ...item })));
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Personalizar Protocolo">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 rounded-2xl border border-border bg-bg-surface space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {phaseOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateItem(index, 'phase', opt.value)}
                    className={cn(
                      'inline-flex items-center justify-center h-11 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors',
                      item.phase === opt.value
                        ? opt.value === 'pre'
                          ? 'bg-phase-pre/20 text-phase-pre'
                          : opt.value === 'during'
                            ? 'bg-phase-during/20 text-phase-during'
                            : 'bg-phase-post/20 text-phase-post'
                        : 'text-text-muted hover:text-text-secondary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  aria-label="Remover item"
                  className="flex items-center justify-center w-11 h-11 text-text-muted hover:text-danger transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>

            <Input
              size="sm"
              type="text"
              placeholder="Produto"
              value={item.productName}
              onChange={(e) => updateItem(index, 'productName', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Field label="Carb (g)">
                <Input
                  size="sm"
                  type="number"
                  value={item.carbsG ?? 0}
                  onChange={(e) => updateItem(index, 'carbsG', Number(e.target.value))}
                  className="font-[var(--font-mono)]"
                />
              </Field>
              <Field label="Sodio (mg)">
                <Input
                  size="sm"
                  type="number"
                  value={item.sodiumMg ?? 0}
                  onChange={(e) => updateItem(index, 'sodiumMg', Number(e.target.value))}
                  className="font-[var(--font-mono)]"
                />
              </Field>
              <Field label="Caf (mg)">
                <Input
                  size="sm"
                  type="number"
                  value={item.caffeineMg ?? 0}
                  onChange={(e) => updateItem(index, 'caffeineMg', Number(e.target.value))}
                  className="font-[var(--font-mono)]"
                />
              </Field>
              <Field label="Kcal">
                <Input
                  size="sm"
                  type="number"
                  value={item.kcal ?? 0}
                  onChange={(e) => updateItem(index, 'kcal', Number(e.target.value))}
                  className="font-[var(--font-mono)]"
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:text-primary-bright transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Adicionar item
        </button>

        {mutation.isError && (
          <AlertBanner variant="danger">Erro ao salvar. Tente novamente.</AlertBanner>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            loading={mutation.isPending}
          >
            Salvar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
