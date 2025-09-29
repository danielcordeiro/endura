import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { SyncStatus } from '../components/strava/SyncStatus';

const featureHighlights = [
  {
    title: 'Integrado ao Strava',
    description: 'Importe automaticamente atividades e visualize métricas de performance por fase.',
  },
  {
    title: 'Suplementação rápida',
    description: 'Lance géis, bebidas e barras em poucos toques e acompanhe macros por treino.',
  },
  {
    title: 'Resumo inteligente',
    description: 'Veja totais diários de carboidratos, proteína e calorias para ajustar sua estratégia.',
  },
];

export const HomePage = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <header className="px-6 py-10 text-center">
        <h1 className="text-3xl font-extrabold">Endura</h1>
        <p className="mt-2 text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
          Treinos, nutrição e insights em um só painel.
        </p>
      </header>

      <main className="flex-1 space-y-6 px-6 pb-12">
        {isAuthenticated && (
          <SyncStatus />
        )}
        
        <section className="rounded-xl bg-card-light p-6 text-center shadow-sm dark:bg-card-dark">
          <h2 className="text-xl font-semibold">Tudo conectado</h2>
          <p className="mt-2 text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
            Conecte sua conta Strava e comece a registrar suplementos por atividade em questão de segundos.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Conectar com Strava
          </Link>
        </section>

        <section className="space-y-4">
          {featureHighlights.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border-light bg-card-light p-4 shadow-sm dark:border-border-dark dark:bg-card-dark"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};
