'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  ChevronRight,
  Inbox,
} from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AlertBanner } from '@/components/ui/alert-banner';

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
    <div className="p-4 bg-bg-surface border border-border rounded-lg animate-pulse space-y-2">
      <div className="h-4 w-2/3 rounded bg-bg-elevated" />
      <div className="h-3 w-1/3 rounded bg-bg-elevated" />
    </div>
  );
}

function ShoppingItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-surface border border-border rounded-lg animate-pulse">
      <div className="w-4 h-4 rounded bg-bg-elevated" />
      <div className="flex-1">
        <div className="h-3.5 w-3/5 rounded bg-bg-elevated" />
      </div>
      <div className="h-3 w-12 rounded bg-bg-elevated" />
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

  const inputClass =
    'w-full h-11 px-3 bg-bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted font-body text-[14px] outline-none transition-colors focus:border-border-focus';

  const smallInputClass =
    'w-full h-9 px-3 bg-bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted font-mono text-[13px] outline-none transition-colors focus:border-border-focus';

  return (
    <div className="py-6 space-y-8">
      {/* Title */}
      <h1 className="font-heading font-bold text-[28px] text-text-primary">
        Nutricao
      </h1>

      {/* Mutation errors */}
      {deletePresetMutation.isError && (
        <AlertBanner variant="danger">Erro ao excluir preset.</AlertBanner>
      )}

      {/* -------- Meus Presets -------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-[18px] text-text-primary flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Meus Presets
          </h2>
          <Button
            variant="ghost"
            onClick={() => setShowCreatePreset(true)}
            className="h-9 text-[12px] px-3"
          >
            <Plus size={14} />
            Criar preset
          </Button>
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
            <div className="w-14 h-14 rounded-full bg-bg-surface flex items-center justify-center">
              <Package size={28} className="text-text-muted" />
            </div>
            <p className="font-body text-[14px] text-text-secondary text-center">
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
                className="flex items-center justify-between p-4 bg-bg-surface border border-border rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-body font-semibold text-[15px] text-text-primary truncate">
                    {preset.name}
                  </p>
                  <p className="font-body text-[12px] text-text-muted mt-0.5">
                    {preset.items.length}{' '}
                    {preset.items.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <button
                  onClick={() => deletePresetMutation.mutate(preset.id)}
                  disabled={deletePresetMutation.isPending}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------- Lista de Compras -------- */}
      <section className="space-y-4">
        <h2 className="font-heading font-semibold text-[18px] text-text-primary flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" />
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
            <div className="w-14 h-14 rounded-full bg-bg-surface flex items-center justify-center">
              <Inbox size={28} className="text-text-muted" />
            </div>
            <p className="font-body text-[14px] text-text-secondary text-center">
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
                className="flex items-center gap-3 p-3 bg-bg-surface border border-border rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <p className="font-body text-[14px] text-text-primary flex-1 truncate">
                  {item.product}
                </p>
                <span className="font-mono text-[13px] text-text-secondary shrink-0">
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
          <div>
            <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary mb-2 block">
              Nome do preset
            </label>
            <input
              type="text"
              placeholder="Ex: Treino longo bike"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <label className="font-body text-[12px] font-medium uppercase tracking-wider text-text-secondary block">
              Itens
            </label>

            {presetItems.map((item, index) => (
              <div
                key={index}
                className="space-y-2 p-3 bg-bg-surface border border-border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body text-[12px] text-text-muted">
                    Item {index + 1}
                  </span>
                  {presetItems.length > 1 && (
                    <button
                      onClick={() => removePresetItem(index)}
                      className="text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Produto"
                  value={item.product}
                  onChange={(e) =>
                    updatePresetItem(index, 'product', e.target.value)
                  }
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Quantidade (ex: 2 unidades)"
                  value={item.quantity}
                  onChange={(e) =>
                    updatePresetItem(index, 'quantity', e.target.value)
                  }
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-body text-[10px] text-text-muted">
                      Carb (g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.carbsG}
                      onChange={(e) =>
                        updatePresetItem(index, 'carbsG', e.target.value)
                      }
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="font-body text-[10px] text-text-muted">
                      Sodio (mg)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.sodiumMg}
                      onChange={(e) =>
                        updatePresetItem(index, 'sodiumMg', e.target.value)
                      }
                      className={smallInputClass}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addPresetItem}
              className="flex items-center gap-1.5 text-primary font-body text-[13px] font-medium hover:text-primary/80 transition-colors"
            >
              <Plus size={14} />
              Adicionar item
            </button>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="font-body text-[13px] text-danger">{validationError}</p>
          )}

          {/* Mutation error */}
          {createPresetMutation.isError && (
            <p className="font-body text-[13px] text-danger">
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
