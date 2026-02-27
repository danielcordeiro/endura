'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';

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

const inputClass =
  'w-full h-9 px-3 bg-[#283139] border border-slate-700/50 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20';

const smallInputClass =
  'w-full h-8 px-2 bg-[#283139] border border-slate-700/50 rounded-lg text-slate-100 placeholder:text-slate-500 font-[var(--font-mono)] text-[12px] outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20';

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
            className="p-3 rounded-2xl border border-slate-800/50 bg-[#1c262f] space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {phaseOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateItem(index, 'phase', opt.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors',
                      item.phase === opt.value
                        ? opt.value === 'pre'
                          ? 'bg-amber-500/20 text-amber-400'
                          : opt.value === 'during'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Produto"
              value={item.productName}
              onChange={(e) => updateItem(index, 'productName', e.target.value)}
              className={inputClass}
            />

            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className="text-[9px] text-slate-500">Carb (g)</label>
                <input
                  type="number"
                  value={item.carbsG ?? 0}
                  onChange={(e) => updateItem(index, 'carbsG', Number(e.target.value))}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500">Sodio (mg)</label>
                <input
                  type="number"
                  value={item.sodiumMg ?? 0}
                  onChange={(e) => updateItem(index, 'sodiumMg', Number(e.target.value))}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500">Caf (mg)</label>
                <input
                  type="number"
                  value={item.caffeineMg ?? 0}
                  onChange={(e) => updateItem(index, 'caffeineMg', Number(e.target.value))}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500">Kcal</label>
                <input
                  type="number"
                  value={item.kcal ?? 0}
                  onChange={(e) => updateItem(index, 'kcal', Number(e.target.value))}
                  className={smallInputClass}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:text-blue-400 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Adicionar item
        </button>

        {mutation.isError && (
          <p className="text-[13px] text-red-400">Erro ao salvar. Tente novamente.</p>
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
