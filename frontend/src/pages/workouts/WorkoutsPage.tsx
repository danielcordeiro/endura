import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mockActivities } from '@/data/mockActivities';
import { activityIconPaths } from '@utils/activityIcons';
import { LogSupplementModal } from '@components/supplements/LogSupplementModal';

const phaseLabels: Record<'pre' | 'during' | 'post', string> = {
  pre: 'Pré-treino',
  during: 'Durante',
  post: 'Pós-treino',
};

type DetailTab = 'workout' | 'supplements';

export const WorkoutsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('supplements');
  const [isModalOpen, setModalOpen] = useState(false);

  const activityId = searchParams.get('activity');

  const selectedActivity = useMemo(() => {
    if (!activityId) {
      return mockActivities[0];
    }
    return mockActivities.find((item) => item.id === activityId) ?? mockActivities[0];
  }, [activityId]);

  useEffect(() => {
    setActiveTab('supplements');
  }, [selectedActivity.id]);

  if (!selectedActivity) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
        <p className="text-lg font-semibold">Nenhuma atividade encontrada</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          Voltar para atividades
        </button>
      </div>
    );
  }

  const activityIcon = activityIconPaths[selectedActivity.type];

  return (
    <div className="flex h-full flex-col bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-light bg-background-light/90 px-4 py-4 backdrop-blur-sm dark:border-border-dark dark:bg-background-dark/90">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-full p-2 text-foreground-light transition-colors hover:bg-primary/10 dark:text-foreground-dark dark:hover:bg-primary/20"
          aria-label="Voltar"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold">Detalhes da atividade</h1>
        <div className="w-8" />
      </header>

      <main className="space-y-6 px-4 py-6">
        <section className="rounded-xl bg-card-light p-4 shadow-sm dark:bg-card-dark">
          <h2 className="mb-4 text-xl font-bold">Dados do treino</h2>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <svg
                fill="currentColor"
                height="24"
                viewBox="0 0 256 256"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={activityIcon} />
              </svg>
            </span>
            <div>
              <p className="text-base font-bold">{selectedActivity.title}</p>
              <p className="text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
                {selectedActivity.dateLabel} - {selectedActivity.startTime}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-border-light pt-4 text-sm dark:border-border-dark">
            <div className="flex justify-between">
              <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Duração</span>
              <span className="font-medium">{selectedActivity.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Distância</span>
              <span className="font-medium">{selectedActivity.distance}</span>
            </div>
            {selectedActivity.heartRate ? (
              <div className="flex justify-between">
                <span className="text-foreground-muted-light dark:text-foreground-muted-dark">FC média</span>
                <span className="font-medium">{selectedActivity.heartRate} bpm</span>
              </div>
            ) : null}
          </div>
        </section>

        <div className="border-b border-border-light dark:border-border-dark">
          <div className="flex gap-4 px-2">
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className={`border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'workout'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted-light dark:text-foreground-muted-dark'
              }`}
            >
              Treino
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supplements')}
              className={`border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'supplements'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted-light dark:text-foreground-muted-dark'
              }`}
            >
              Suplementos
            </button>
          </div>
        </div>

        {activeTab === 'workout' ? (
          <section className="space-y-3 rounded-xl bg-card-light p-4 shadow-sm dark:bg-card-dark">
            <h2 className="text-lg font-semibold">Resumo do treino</h2>
            <p className="text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
              Concentre-se em manter a consistência dos treinos e revisar a sensação pós-atividade para aprimorar a estratégia nutricional.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Registro de suplementos</h2>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20"
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
                <span>Adicionar consumo</span>
              </button>
            </div>

            <div className="space-y-3">
              {selectedActivity.supplements.map((supplement) => (
                <div
                  key={supplement.id}
                  className="flex items-center gap-4 rounded-xl bg-card-light p-3 shadow-sm dark:bg-card-dark"
                >
                  <img
                    src={supplement.imageUrl}
                    alt={supplement.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{supplement.name}</p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                        {phaseLabels[supplement.phase]}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted-light dark:text-foreground-muted-dark">
                      {supplement.servings} {supplement.servingUnit} - {supplement.calories} kcal
                    </p>
                    <p className="text-xs text-foreground-muted-light dark:text-foreground-muted-dark">
                      Carboidratos {supplement.carbs} g - Proteína {supplement.protein} g
                    </p>
                  </div>
                </div>
              ))}
              {selectedActivity.supplements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-light p-4 text-center text-sm text-foreground-muted-light dark:border-border-dark dark:text-foreground-muted-dark">
                  Nenhum suplemento lançado ainda para esta atividade.
                </div>
              ) : null}
            </div>

            <section className="rounded-xl bg-card-light p-4 shadow-sm dark:bg-card-dark">
              <h3 className="mb-4 text-lg font-semibold">Resumo nutricional</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Total de calorias</span>
                  <span className="font-medium">{selectedActivity.summary.calories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Carboidratos</span>
                  <span className="font-medium">{selectedActivity.summary.carbs} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Proteína</span>
                  <span className="font-medium">{selectedActivity.summary.protein} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted-light dark:text-foreground-muted-dark">Gorduras</span>
                  <span className="font-medium">{selectedActivity.summary.fat} g</span>
                </div>
              </div>
            </section>
          </section>
        )}
      </main>

      <LogSupplementModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

