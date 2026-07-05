'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ProductAutocomplete, type CatalogProduct } from '@/components/ui/product-autocomplete';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

/* ---------- Types ---------- */

interface PresetItem {
  product: string;
  quantity: string;
  carbsG: number;
  sodiumMg: number;
}

interface Preset {
  id: string;
  name: string;
  items: PresetItem[];
}

interface PresetsResponse {
  data: Preset[];
}

interface ShoppingItem {
  product: string;
  totalQuantity: string;
  category?: string;
}

interface ShoppingListResponse {
  data: ShoppingItem[];
}

/* ---------- Skeletons ---------- */

function PresetSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-slate-800/50 bg-[#1c262f] animate-pulse space-y-2">
      <div className="h-4 w-2/3 rounded bg-slate-800/60" />
      <div className="h-3 w-1/3 rounded bg-slate-800/60" />
    </div>
  );
}

function ShoppingItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-800/50 bg-[#1c262f] animate-pulse">
      <div className="w-4 h-4 rounded-full bg-slate-800/60" />
      <div className="flex-1">
        <div className="h-3.5 w-3/5 rounded bg-slate-800/60" />
      </div>
      <div className="h-3 w-12 rounded bg-slate-800/60" />
    </div>
  );
}

/* ---------- Page ---------- */

export default function NutricaoPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetItems, setPresetItems] = useState<
    { product: string; quantity: string; carbsG: string; sodiumMg: string }[]
  >([{ product: '', quantity: '', carbsG: '', sodiumMg: '' }]);
  const [validationError, setValidationError] = useState('');

  /* Presets query */
  const presetsQuery = useQuery<PresetsResponse>({
    queryKey: ['nutrition-presets'],
    queryFn: () =>
      apiFetch<PresetsResponse>('/api/nutrition/presets', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  /* Shopping list query */
  const shoppingListQuery = useQuery<ShoppingListResponse>({
    queryKey: ['nutrition-shopping-list'],
    queryFn: () =>
      apiFetch<ShoppingListResponse>('/api/nutrition/shopping-list', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  /* Delete preset mutation */
  const deletePresetMutation = useMutation({
    mutationFn: (presetId: string) =>
      apiFetch(`/api/nutrition/presets/${presetId}`, {
        method: 'DELETE',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-presets'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-shopping-list'] });
    },
  });

  /* Create preset mutation */
  const createPresetMutation = useMutation({
    mutationFn: (payload: { name: string; items: PresetItem[] }) =>
      apiFetch('/api/nutrition/presets', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-presets'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-shopping-list'] });
      resetPresetForm();
      setShowCreatePreset(false);
    },
  });

  function resetPresetForm() {
    setPresetName('');
    setPresetItems([{ product: '', quantity: '', carbsG: '', sodiumMg: '' }]);
    setValidationError('');
  }

  function addPresetItem() {
    setPresetItems((prev) => [
      ...prev,
      { product: '', quantity: '', carbsG: '', sodiumMg: '' },
    ]);
  }

  function removePresetItem(index: number) {
    if (presetItems.length <= 1) return;
    setPresetItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePresetItem(
    index: number,
    field: keyof (typeof presetItems)[0],
    value: string,
  ) {
    setPresetItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  /* Catalogo: ao escolher um produto, preenche carb/sodio (presets so guardam esses dois). */
  function handlePresetProductSelect(index: number, product: CatalogProduct) {
    setPresetItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              carbsG: product.carbsG ?? item.carbsG,
              sodiumMg: product.sodiumMg ?? item.sodiumMg,
            }
          : item,
      ),
    );
  }

  function handleCreatePreset() {
    if (!presetName.trim()) {
      setValidationError('Informe o nome do preset.');
      return;
    }
    const validItems = presetItems.filter(
      (item) => item.product.trim() && item.quantity.trim(),
    );
    if (validItems.length === 0) {
      setValidationError('Adicione pelo menos um item com produto e quantidade.');
      return;
    }
    setValidationError('');

    createPresetMutation.mutate({
      name: presetName.trim(),
      items: validItems.map((item) => ({
        product: item.product.trim(),
        quantity: item.quantity.trim(),
        carbsG: Number(item.carbsG) || 0,
        sodiumMg: Number(item.sodiumMg) || 0,
      })),
    });
  }

  const presets = presetsQuery.data?.data ?? [];
  const shoppingList = shoppingListQuery.data?.data ?? [];

  return (
    <div className="py-6 space-y-8">
      {/* Title */}
      <h1 className="font-[var(--font-heading)] font-bold text-[28px] text-slate-100">
        Nutricao
      </h1>

      {/* Navigation */}
      <div className="flex gap-2">
        <Link
          href="/nutricao/tendencias"
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
            'text-xs font-semibold text-primary',
            'bg-primary/10 border border-primary/20',
            'hover:bg-primary/20 transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-sm">monitoring</span>
          Tendencias
        </Link>
        <Link
          href="/nutricao/race-day"
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
            'text-xs font-semibold text-primary',
            'bg-primary/10 border border-primary/20',
            'hover:bg-primary/20 transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-sm">flag</span>
          Race Day
        </Link>
      </div>

      {/* Mutation errors */}
      {deletePresetMutation.isError && (
        <AlertBanner variant="danger">Erro ao excluir preset.</AlertBanner>
      )}

      {/* -------- Meus Presets -------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">inventory_2</span>
            Meus Presets
          </h2>
          <button
            onClick={() => setShowCreatePreset(true)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
              'text-xs font-semibold text-primary',
              'bg-primary/10 border border-primary/20',
              'hover:bg-primary/20 transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Criar preset
          </button>
        </div>

        {/* Loading */}
        {presetsQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <PresetSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!presetsQuery.isLoading && presets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#1c262f] border border-slate-800/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-slate-500">inventory_2</span>
            </div>
            <p className="text-sm text-slate-400 text-center">
              Nenhum preset criado ainda.
            </p>
          </div>
        )}

        {/* Preset list */}
        {!presetsQuery.isLoading && presets.length > 0 && (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-800/50 bg-[#1c262f] hover:bg-[#283139] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] text-slate-100 truncate">
                    {preset.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {preset.items.length}{' '}
                    {preset.items.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <button
                  onClick={() => deletePresetMutation.mutate(preset.id)}
                  disabled={deletePresetMutation.isPending}
                  className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------- Lista de Compras -------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">shopping_cart</span>
          Lista de Compras
        </h2>

        {/* Loading */}
        {shoppingListQuery.isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <ShoppingItemSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!shoppingListQuery.isLoading && shoppingList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#1c262f] border border-slate-800/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-slate-500">inbox</span>
            </div>
            <p className="text-sm text-slate-400 text-center">
              Nenhum item na lista de compras.
            </p>
          </div>
        )}

        {/* Shopping list */}
        {!shoppingListQuery.isLoading && shoppingList.length > 0 && (
          <div className="space-y-1.5">
            {shoppingList.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-800/50 bg-[#1c262f]"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <p className="text-sm text-slate-100 flex-1 truncate">
                  {item.product}
                </p>
                <span className="font-[var(--font-mono)] text-[13px] text-slate-400 shrink-0">
                  {item.totalQuantity}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {shoppingListQuery.isError && (
          <AlertBanner variant="danger">
            Erro ao carregar lista de compras.
          </AlertBanner>
        )}
      </section>

      {/* -------- Create Preset BottomSheet -------- */}
      <BottomSheet
        open={showCreatePreset}
        onClose={() => {
          resetPresetForm();
          setShowCreatePreset(false);
        }}
        title="Criar preset"
      >
        <div className="space-y-5">
          {/* Preset name */}
          <Field label="Nome do preset">
            <Input
              type="text"
              placeholder="Ex: Treino longo bike"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
          </Field>

          {/* Items */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block">
              Itens
            </label>

            {presetItems.map((item, index) => (
              <div
                key={index}
                className="space-y-3 p-3 rounded-2xl border border-slate-800/50 bg-[#1c262f]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Item {index + 1}
                  </span>
                  {presetItems.length > 1 && (
                    <button
                      onClick={() => removePresetItem(index)}
                      aria-label="Remover item"
                      className="flex items-center justify-center w-11 h-11 -m-2.5 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
                <ProductAutocomplete
                  value={item.product}
                  onChange={(v) => updatePresetItem(index, 'product', v)}
                  onProductSelect={(p) => handlePresetProductSelect(index, p)}
                  placeholder="Produto"
                  className="h-11 px-3 pr-10 border border-border-strong/50 bg-bg-input rounded-xl text-sm"
                />
                <Input
                  type="text"
                  placeholder="Quantidade (ex: 2 unidades)"
                  value={item.quantity}
                  onChange={(e) =>
                    updatePresetItem(index, 'quantity', e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  <Field label="Carb (g)">
                    <Input
                      size="sm"
                      type="number"
                      placeholder="0"
                      value={item.carbsG}
                      onChange={(e) =>
                        updatePresetItem(index, 'carbsG', e.target.value)
                      }
                      className="font-[var(--font-mono)]"
                    />
                  </Field>
                  <Field label="Sodio (mg)">
                    <Input
                      size="sm"
                      type="number"
                      placeholder="0"
                      value={item.sodiumMg}
                      onChange={(e) =>
                        updatePresetItem(index, 'sodiumMg', e.target.value)
                      }
                      className="font-[var(--font-mono)]"
                    />
                  </Field>
                </div>
              </div>
            ))}

            <button
              onClick={addPresetItem}
              className="flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:text-primary-bright transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Adicionar item
            </button>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="text-[13px] text-red-400">{validationError}</p>
          )}

          {/* Mutation error */}
          {createPresetMutation.isError && (
            <p className="text-[13px] text-red-400">
              Erro ao criar preset. Tente novamente.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                resetPresetForm();
                setShowCreatePreset(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreatePreset}
              loading={createPresetMutation.isPending}
            >
              Salvar
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Spacer for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
