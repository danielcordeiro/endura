import { useMemo, useState } from 'react';
import { mockActivities } from '@/data/mockActivities';
import {
  LogSupplementModal,
  type SupplementFormValues,
  type SupplementPhase,
} from '@components/supplements/LogSupplementModal';

interface SupplementEntry {
  id: string;
  activityId: string;
  activityTitle: string;
  date: string;
  dateLabel: string;
  phase: SupplementPhase;
  name: string;
  servings: number;
  servingUnit: string;
  calories: number;
  carbs: number;
  protein: number;
  imageUrl: string;
}

type FilterOption = 'all' | SupplementPhase;

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=160&q=80';

const buildInitialEntries = (): SupplementEntry[] => {
  return mockActivities
    .flatMap((activity) =>
      activity.supplements.map<SupplementEntry>((supplement) => ({
        id: `${activity.id}-${supplement.id}`,
        activityId: activity.id,
        activityTitle: activity.title,
        date: activity.date,
        dateLabel: activity.dateLabel,
        phase: supplement.phase,
        name: supplement.name,
        servings: supplement.servings,
        servingUnit: supplement.servingUnit,
        calories: supplement.calories,
        carbs: supplement.carbs,
        protein: supplement.protein,
        imageUrl: supplement.imageUrl,
      }))
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
};

const filterLabels: Record<FilterOption, string> = {
  all: 'Todos',
  pre: 'Pr�',
  during: 'Durante',
  post: 'P�s',
};

export const SupplementsPage = () => {
  const [entries, setEntries] = useState<SupplementEntry[]>(buildInitialEntries);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isModalOpen, setModalOpen] = useState(false);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') {
      return entries;
    }
    return entries.filter((entry) => entry.phase === filter);
  }, [entries, filter]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.calories += entry.calories;
        acc.carbs += entry.carbs;
        acc.protein += entry.protein;
        acc.count += 1;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, count: 0 }
    );
  }, [entries]);

  const handleSave = (values: SupplementFormValues) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const dateLabel = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newEntry: SupplementEntry = {
      id: `manual-${now.getTime()}`,
      activityId: 'manual',
      activityTitle: 'Entrada manual',
      date,
      dateLabel,
      phase: values.phase,
      name: values.product,
      servings: values.quantity,
      servingUnit: values.quantity === 1 ? 'por��o' : 'por��es',
      calories: values.calories ?? 0,
      carbs: values.carbs ?? 0,
      protein: 0, // Default value since protein is not in form
      imageUrl: DEFAULT_IMAGE,
    };

    setEntries((current) => [newEntry, ...current]);
  };

  const currentPhaseForModal = filter === 'all' ? 'pre' : filter;

  return (
    <div className="flex h-full flex-col bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-light bg-background-light/90 px-4 py-4 backdrop-blur-sm dark:border-border-dark dark:bg-background-dark/90">
        <h1 className="text-lg font-bold">Suplementos</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <svg
            fill="none"
            height="18"
            viewBox="0 0 24 24"
            width="18"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Registrar
        </button>
      </header>

      <main className="space-y-6 px-4 py-6">
        <section className="rounded-xl bg-card-light p-4 shadow-sm dark:bg-card-dark">
          <h2 className="mb-4 text-lg font-semibold">Resumo di�rio</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-primary/10 px-4 py-3 text-primary dark:bg-primary/20">
              <p className="text-xs uppercase tracking-wide">Entradas</p>
              <p className="text-xl font-bold">{totals.count}</p>
            </div>
            <div className="rounded-lg bg-success/10 px-4 py-3 text-success">
              <p className="text-xs uppercase tracking-wide">Calorias</p>
              <p className="text-xl font-bold">{totals.calories} kcal</p>
            </div>
            <div className="rounded-lg bg-card-dark/5 px-4 py-3 text-foreground-light dark:bg-card-light/10 dark:text-foreground-dark">
              <p className="text-xs uppercase tracking-wide">Carboidratos</p>
              <p className="text-xl font-bold">{totals.carbs} g</p>
            </div>
            <div className="rounded-lg bg-card-dark/5 px-4 py-3 text-foreground-light dark:bg-card-light/10 dark:text-foreground-dark">
              <p className="text-xs uppercase tracking-wide">Prote�na</p>
              <p className="text-xl font-bold">{totals.protein} g</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(filterLabels) as FilterOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === option
                    ? 'bg-primary text-white'
                    : 'bg-card-light text-foreground-muted-light hover:bg-primary/10 dark:bg-card-dark dark:text-foreground-muted-dark'
                }`}
              >
                {filterLabels[option]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="flex items-center gap-4 rounded-xl bg-card-light p-3 shadow-sm dark:bg-card-dark"
              >
                <img
                  src={entry.imageUrl}
                  alt={entry.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{entry.name}</p>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                      {filterLabels[entry.phase]}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted-light dark:text-foreground-muted-dark">
                    {entry.servings} {entry.servingUnit} - {entry.calories} kcal
                  </p>
                  <p className="text-xs text-foreground-muted-light dark:text-foreground-muted-dark">
                    {entry.carbs} g carboidratos - {entry.protein} g prote�na
                  </p>
                  <p className="text-xs text-foreground-muted-light dark:text-foreground-muted-dark">
                    {entry.dateLabel}  -  {entry.activityTitle}
                  </p>
                </div>
              </article>
            ))}

            {filteredEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-light p-6 text-center text-sm text-foreground-muted-light dark:border-border-dark dark:text-foreground-muted-dark">
                Nenhum suplemento lan�ado para este filtro.
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <LogSupplementModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        defaultPhase={currentPhaseForModal}
      />
    </div>
  );
};

