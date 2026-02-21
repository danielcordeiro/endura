'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';

/* ---------- Types ---------- */

type Phase = 'pre' | 'during' | 'post';

interface LogSupplementSheetProps {
  activityId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LogPayload {
  phase: Phase;
  product: string;
  quantity: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  kcal: number;
  minuteOffset: number;
}

/* ---------- Constants ---------- */

const phaseOptions: { value: Phase; label: string; colorClass: string; bgClass: string }[] = [
  { value: 'pre', label: 'PRE', colorClass: 'text-phase-pre', bgClass: 'bg-phase-pre' },
  { value: 'during', label: 'DURANTE', colorClass: 'text-phase-during', bgClass: 'bg-phase-during' },
  { value: 'post', label: 'POS', colorClass: 'text-phase-post', bgClass: 'bg-phase-post' },
];

/* ---------- Component ---------- */

export function LogSupplementSheet({
  activityId,
  open,
  onClose,
  onSuccess,
}: LogSupplementSheetProps) {
  const { token } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('during');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [sodiumMg, setSodiumMg] = useState('');
  const [caffeineMg, setCaffeineMg] = useState('');
  const [kcal, setKcal] = useState('');
  const [minuteOffset, setMinuteOffset] = useState('0');
  const [showNutrients, setShowNutrients] = useState(false);
  const [validationError, setValidationError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: LogPayload) =>
      apiFetch(`/api/nutrition/log/${activityId}/items`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
  });

  function resetForm() {
    setPhase('during');
    setProduct('');
    setQuantity('');
    setCarbsG('');
    setSodiumMg('');
    setCaffeineMg('');
    setKcal('');
    setMinuteOffset('0');
    setShowNutrients(false);
    setValidationError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSave() {
    if (!product.trim()) {
      setValidationError('Informe o produto.');
      return;
    }
    if (!quantity.trim()) {
      setValidationError('Informe a quantidade.');
      return;
    }
    setValidationError('');

    mutation.mutate({
      phase,
      product: product.trim(),
      quantity: quantity.trim(),
      carbsG: Number(carbsG) || 0,
      sodiumMg: Number(sodiumMg) || 0,
      caffeineMg: Number(caffeineMg) || 0,
      kcal: Number(kcal) || 0,
      minuteOffset: Number(minuteOffset) || 0,
    });
  }

  const inputClass =
    'w-full h-12 px-4 bg-bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted font-body text-[15px] outline-none transition-colors focus:border-border-focus';

  const smallInputClass =
    'w-full h-10 px-3 bg-bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted font-mono text-[14px] outline-none transition-colors focus:border-border-focus';

  return (
    <BottomSheet open={open} onClose={handleClose} title="Adicionar consumo">
      <div className="space-y-5">
        {/* Phase toggle */}
        <div>
          <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary mb-2 block">
            Fase
          </label>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {phaseOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPhase(opt.value)}
                className={cn(
                  'flex-1 py-2.5 font-body text-[13px] font-semibold uppercase tracking-wider transition-colors',
                  phase === opt.value
                    ? `${opt.bgClass} text-bg-base`
                    : 'bg-bg-surface text-text-muted hover:bg-bg-elevated',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product */}
        <div>
          <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary mb-2 block">
            Produto
          </label>
          <input
            type="text"
            placeholder="Ex: Gel SiS Isotonic"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary mb-2 block">
            Quantidade
          </label>
          <input
            type="text"
            placeholder="Ex: 1 unidade, 500ml, 2 capsulas"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Minute offset */}
        <div>
          <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary mb-2 block">
            Minuto relativo
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minuteOffset}
              onChange={(e) => setMinuteOffset(e.target.value)}
              className={cn(inputClass, 'w-24 text-center font-mono')}
            />
            <span className="font-body text-[13px] text-text-muted">
              {Number(minuteOffset) >= 0 ? `+${minuteOffset}min` : `${minuteOffset}min`}
            </span>
          </div>
        </div>

        {/* Collapsible nutrients */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowNutrients(!showNutrients)}
            className="flex items-center justify-between w-full p-3 bg-bg-surface hover:bg-bg-elevated transition-colors"
          >
            <span className="font-body text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
              Nutrientes
            </span>
            {showNutrients ? (
              <ChevronUp size={16} className="text-text-muted" />
            ) : (
              <ChevronDown size={16} className="text-text-muted" />
            )}
          </button>

          {showNutrients && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-bg-base">
              <div>
                <label className="font-body text-[11px] text-text-muted mb-1 block">
                  Carboidratos (g)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={carbsG}
                  onChange={(e) => setCarbsG(e.target.value)}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="font-body text-[11px] text-text-muted mb-1 block">
                  Sodio (mg)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={sodiumMg}
                  onChange={(e) => setSodiumMg(e.target.value)}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="font-body text-[11px] text-text-muted mb-1 block">
                  Cafeina (mg)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={caffeineMg}
                  onChange={(e) => setCaffeineMg(e.target.value)}
                  className={smallInputClass}
                />
              </div>
              <div>
                <label className="font-body text-[11px] text-text-muted mb-1 block">
                  Kcal
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                  className={smallInputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Validation error */}
        {validationError && (
          <p className="font-body text-[13px] text-danger">{validationError}</p>
        )}

        {/* Mutation error */}
        {mutation.isError && (
          <p className="font-body text-[13px] text-danger">
            Erro ao salvar. Tente novamente.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={handleClose}>
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
