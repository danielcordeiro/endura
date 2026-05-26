'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PhaseToggle } from '@/components/ui/phase-tag';
import { ProductAutocomplete, type CatalogProduct } from '@/components/ui/product-autocomplete';

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
  productName: string;
  quantity: number;
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
      productName: product.trim(),
      quantity: Number(quantity) || 1,
      carbsG: Number(carbsG) || 0,
      sodiumMg: Number(sodiumMg) || 0,
      caffeineMg: Number(caffeineMg) || 0,
      kcal: Number(kcal) || 0,
      minuteOffset: Number(minuteOffset) || 0,
    });
  }

  function handleProductSelect(catalogProduct: CatalogProduct) {
    if (catalogProduct.carbsG) setCarbsG(catalogProduct.carbsG);
    if (catalogProduct.sodiumMg) setSodiumMg(catalogProduct.sodiumMg);
    if (catalogProduct.caffeineMg) setCaffeineMg(catalogProduct.caffeineMg);
    if (catalogProduct.kcal) setKcal(String(catalogProduct.kcal));
    setShowNutrients(true);
  }

  function incrementQuantity() {
    setQuantity((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) + 1)));
  }

  function decrementQuantity() {
    setQuantity((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) - 1)));
  }

  const labelClass = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block';

  const smallInputClass =
    'w-full h-11 px-3 bg-bg-elevated border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 font-[var(--font-mono)] text-[14px] outline-none transition-colors focus:border-primary';

  /* Nutrient summary for collapsed state */
  const nutrientParts: string[] = [];
  if (carbsG) nutrientParts.push(`${carbsG}g CHO`);
  if (sodiumMg) nutrientParts.push(`${sodiumMg}mg Na+`);
  if (caffeineMg) nutrientParts.push(`${caffeineMg}mg Caf`);
  if (kcal) nutrientParts.push(`${kcal} kcal`);
  const nutrientSummary = nutrientParts.length > 0 ? nutrientParts.join(', ') : '';

  return (
    <BottomSheet open={open} onClose={handleClose} title="Adicionar consumo">
      <div className="flex flex-col gap-6">
        {/* Phase toggle — no label, matches design */}
        <PhaseToggle value={phase} onChange={setPhase} />

        {/* Product — autocomplete with catalog + free text */}
        <div>
          <label className={labelClass}>Produto</label>
          <ProductAutocomplete
            value={product}
            onChange={setProduct}
            onProductSelect={handleProductSelect}
          />
        </div>

        {/* Quantity + Time offset — side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Quantity stepper — integrated pill */}
          <div>
            <label className={labelClass}>Quantidade</label>
            <div className="flex items-center h-14 bg-bg-elevated rounded-full border border-slate-700/50 overflow-hidden">
              <button
                type="button"
                onClick={decrementQuantity}
                className="flex items-center justify-center w-12 h-full text-slate-400 hover:text-white active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined text-xl">remove</span>
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 h-full text-center bg-transparent text-white font-[var(--font-mono)] text-lg font-bold outline-none"
              />
              <button
                type="button"
                onClick={incrementQuantity}
                className="flex items-center justify-center w-12 h-full text-slate-400 hover:text-white active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            </div>
          </div>

          {/* Time offset — pill with clock icon */}
          <div>
            <label className={labelClass}>Tempo (+offset)</label>
            <div className="flex items-center h-14 bg-bg-elevated rounded-full border border-slate-700/50 px-4 gap-2">
              <span className="material-symbols-outlined text-primary text-xl">schedule</span>
              <span className="text-slate-500 text-[15px]">+</span>
              <input
                type="number"
                value={minuteOffset}
                onChange={(e) => setMinuteOffset(e.target.value)}
                className="w-12 h-full bg-transparent text-center text-white font-[var(--font-mono)] text-lg font-bold outline-none"
              />
              <span className="text-slate-400 text-[14px]">min</span>
            </div>
          </div>
        </div>

        {/* Collapsible nutrients — with icon and summary */}
        <details
          open={showNutrients}
          onToggle={(e) => setShowNutrients((e.target as HTMLDetailsElement).open)}
          className="bg-bg-surface border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          <summary className="flex items-center w-full px-4 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden gap-3">
            <span className="material-symbols-outlined text-primary text-xl">science</span>
            <span className="text-white text-[14px] font-semibold">Nutrientes</span>
            <span className="ml-auto flex items-center gap-2">
              {!showNutrients && nutrientSummary && (
                <span className="text-[12px] text-slate-400">{nutrientSummary}</span>
              )}
              <span className="material-symbols-outlined text-slate-500 text-lg">
                {showNutrients ? 'expand_less' : 'expand_more'}
              </span>
            </span>
          </summary>

          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Carbs (g)</label>
              <input
                type="number"
                placeholder="0"
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
                className={smallInputClass}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Sódio (mg)</label>
              <input
                type="number"
                placeholder="0"
                value={sodiumMg}
                onChange={(e) => setSodiumMg(e.target.value)}
                className={smallInputClass}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Cafeína (mg)</label>
              <input
                type="number"
                placeholder="0"
                value={caffeineMg}
                onChange={(e) => setCaffeineMg(e.target.value)}
                className={smallInputClass}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Kcal</label>
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

        {/* Validation / mutation errors */}
        {validationError && (
          <p className="text-[13px] text-red-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">error</span>
            {validationError}
          </p>
        )}
        {mutation.isError && (
          <p className="text-[13px] text-red-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">error</span>
            Erro ao salvar. Tente novamente.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-6 mt-auto">
        <Button variant="secondary" fullWidth onClick={handleClose} className="h-14">
          Cancelar
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={handleSave}
          loading={mutation.isPending}
          className="h-14"
        >
          Salvar
        </Button>
      </div>
    </BottomSheet>
  );
}
