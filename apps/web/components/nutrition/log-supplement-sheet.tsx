'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PhaseToggle } from '@/components/ui/phase-tag';

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
  const [quantity, setQuantity] = useState('1');
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
    setQuantity('1');
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

  function incrementQuantity() {
    setQuantity((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) + 1)));
  }

  function decrementQuantity() {
    setQuantity((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) - 1)));
  }

  const inputClass =
    'w-full h-14 px-5 bg-[#1c262f] border border-slate-700/50 rounded-full text-white placeholder:text-slate-500 text-[15px] outline-none transition-colors focus:border-primary';

  const smallInputClass =
    'w-full h-12 px-4 bg-[#1c262f] border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 font-[var(--font-mono)] text-[14px] outline-none transition-colors focus:border-primary';

  return (
    <BottomSheet open={open} onClose={handleClose} title="Adicionar consumo">
      <div className="space-y-5">
        {/* Phase toggle — segmented pill */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Fase
          </label>
          <PhaseToggle value={phase} onChange={setPhase} />
        </div>

        {/* Product */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Produto
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Ex: Gel SiS Isotonic"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className={cn(inputClass, 'pl-12')}
            />
          </div>
        </div>

        {/* Quantity stepper */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Quantidade
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={decrementQuantity}
              className="w-12 h-12 rounded-full bg-[#283139] border border-slate-700/50 flex items-center justify-center text-white hover:bg-[#2f3b44] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">remove</span>
            </button>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 h-12 text-center bg-[#1c262f] border border-slate-700/50 rounded-full text-white font-[var(--font-mono)] text-lg font-bold outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={incrementQuantity}
              className="w-12 h-12 rounded-full bg-[#283139] border border-slate-700/50 flex items-center justify-center text-white hover:bg-[#2f3b44] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
          </div>
        </div>

        {/* Minute offset */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Minuto relativo
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={minuteOffset}
              onChange={(e) => setMinuteOffset(e.target.value)}
              className="w-24 h-12 text-center bg-[#1c262f] border border-slate-700/50 rounded-full text-white font-[var(--font-mono)] outline-none focus:border-primary"
            />
            <span className="text-[13px] text-slate-500">
              {Number(minuteOffset) >= 0 ? `+${minuteOffset}min` : `${minuteOffset}min`}
            </span>
          </div>
        </div>

        {/* Collapsible nutrients */}
        <details
          open={showNutrients}
          onToggle={(e) => setShowNutrients((e.target as HTMLDetailsElement).open)}
          className="bg-[#1c262f] border border-slate-700/50 rounded-3xl overflow-hidden"
        >
          <summary className="flex items-center justify-between w-full p-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400">
              Nutrientes
            </span>
            <span className="material-symbols-outlined text-slate-500 text-xl transition-transform">
              {showNutrients ? 'expand_less' : 'expand_more'}
            </span>
          </summary>

          <div className="grid grid-cols-2 gap-3 p-4 pt-0">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">
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
              <label className="text-[11px] text-slate-500 mb-1 block">
                Sódio (mg)
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
              <label className="text-[11px] text-slate-500 mb-1 block">
                Cafeína (mg)
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
              <label className="text-[11px] text-slate-500 mb-1 block">
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
        </details>

        {/* Validation error */}
        {validationError && (
          <p className="text-[13px] text-red-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">error</span>
            {validationError}
          </p>
        )}

        {/* Mutation error */}
        {mutation.isError && (
          <p className="text-[13px] text-red-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">error</span>
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
