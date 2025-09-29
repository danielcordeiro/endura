import { FormEvent, useEffect, useState } from 'react';
import { cn } from '@utils/cn';

export type SupplementPhase = 'pre' | 'during' | 'post';

export type SupplementFormValues = {
  product: string;
  quantity: number;
  phase: SupplementPhase;
  carbs?: number;
  sodium?: number;
  caffeine?: number;
  calories?: number;
};

interface LogSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (values: SupplementFormValues) => void;
  defaultPhase?: SupplementPhase;
}

export const LogSupplementModal = ({
  isOpen,
  onClose,
  onSave,
  defaultPhase = 'pre',
}: LogSupplementModalProps) => {
  const [phase, setPhase] = useState<SupplementPhase>(defaultPhase);

  useEffect(() => {
    setPhase(defaultPhase);
  }, [defaultPhase]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const values: SupplementFormValues = {
      product: String(formData.get('product') ?? '').trim(),
      quantity: Number(formData.get('quantity') ?? 0),
      phase,
      carbs: formData.get('carbs') ? Number(formData.get('carbs')) : undefined,
      sodium: formData.get('sodium') ? Number(formData.get('sodium')) : undefined,
      caffeine: formData.get('caffeine') ? Number(formData.get('caffeine')) : undefined,
      calories: formData.get('calories') ? Number(formData.get('calories')) : undefined,
    };

    onSave?.(values);
    onClose();
  };

  const handlePhaseSelect = (nextPhase: SupplementPhase) => {
    setPhase(nextPhase);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface-light shadow-2xl dark:bg-surface-dark">
        <div className="relative px-6 pb-4 pt-6">
          <h2 className="text-center text-2xl font-bold text-text-light dark:text-text-dark">
            Lançar suplemento
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-subtle-text-light transition-colors hover:bg-primary/10 dark:text-subtle-text-dark dark:hover:bg-primary/20"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 256 256"
              width="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
            </svg>
          </button>
        </div>

        <form className="space-y-6 px-6 pb-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-subtle-text-light dark:text-subtle-text-dark" htmlFor="product">
              Produto
            </label>
            <input
              id="product"
              name="product"
              type="text"
              required
              placeholder="Ex: SIS Go Isotonic Gel"
              className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-subtle-text-light dark:text-subtle-text-dark" htmlFor="quantity">
              Quantidade / porções
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="0.5"
              required
              placeholder="1"
              className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-subtle-text-light dark:text-subtle-text-dark">Fase</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'pre', label: 'Pré' },
                  { key: 'during', label: 'Durante' },
                  { key: 'post', label: 'Pós' },
                ] as Array<{ key: SupplementPhase; label: string }>
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePhaseSelect(key)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                    phase === key
                      ? {
                          pre: 'bg-primary text-white border-transparent',
                          during: 'bg-success text-white border-transparent',
                          post: 'bg-warning text-white border-transparent',
                        }[key]
                      : 'border-border-light text-subtle-text-light hover:border-primary hover:text-text-light dark:border-border-dark dark:text-subtle-text-dark dark:hover:border-primary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-subtle-text-light dark:text-subtle-text-dark">Nutrientes (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="carbs"
                type="number"
                min="0"
                placeholder="Carboidratos (g)"
                className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
              />
              <input
                name="sodium"
                type="number"
                min="0"
                placeholder="Sódio (mg)"
                className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
              />
              <input
                name="caffeine"
                type="number"
                min="0"
                placeholder="Cafeína (mg)"
                className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
              />
              <input
                name="calories"
                type="number"
                min="0"
                placeholder="Kcal"
                className="w-full rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light placeholder:text-subtle-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:placeholder:text-subtle-text-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-background-light px-6 py-4 text-center font-bold text-text-light transition-colors hover:bg-border-light dark:bg-background-dark dark:text-text-dark dark:hover:bg-border-dark"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-6 py-4 text-center font-bold text-white transition-colors hover:bg-primary/90"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
