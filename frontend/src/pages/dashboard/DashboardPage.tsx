import { useNavigate } from 'react-router-dom';
import { cn } from '@utils/cn';
import { mockActivities } from '@/data/mockActivities';
import { activityIconPaths, statusIcons } from '@utils/activityIcons';

export const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-light bg-background-light/90 px-4 py-4 backdrop-blur-sm dark:border-border-dark dark:bg-background-dark/90">
        <div className="w-10" />
        <h1 className="text-lg font-bold">Minhas atividades</h1>
        <button
          type="button"
          className="flex items-center justify-center rounded-full p-2 text-foreground-light transition-colors hover:bg-primary/10 dark:text-foreground-dark dark:hover:bg-primary/20"
          aria-label="Sincronizar atividades"
        >
          <svg
            fill="currentColor"
            height="24"
            viewBox="0 0 256 256"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39l-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z" />
          </svg>
        </button>
      </header>

      <main className="px-4 py-6">
        <section>
          <h2 className="mb-3 text-base font-semibold">Últimos 30 dias</h2>
          <div className="space-y-3">
            {mockActivities.map((activity) => {
              const status = statusIcons[activity.status];
              const activityPath = activityIconPaths[activity.type];

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => navigate(`/workouts?activity=${activity.id}`)}
                  className="flex w-full items-center gap-4 rounded-xl bg-card-light p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-card-dark"
                >
                  <span className="rounded-full bg-primary/10 p-3 text-primary dark:bg-primary/20">
                    <svg
                      fill="currentColor"
                      height="24"
                      viewBox="0 0 256 256"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d={activityPath} />
                    </svg>
                  </span>

                  <div className="flex flex-1 flex-col">
                    <p className="font-bold">
                      {activity.title}
                      <span className="font-medium text-foreground-muted-light dark:text-foreground-muted-dark">
                        {' '}- {activity.dateLabel}
                      </span>
                    </p>
                    <p className="text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
                      {activity.distance} - {activity.duration}
                    </p>
                  </div>

                  <span
                    role="img"
                    aria-label={status.label}
                    className={cn('ml-auto flex items-center text-sm font-medium', status.color)}
                  >
                    <svg
                      aria-hidden
                      fill="currentColor"
                      height="24"
                      viewBox="0 0 256 256"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d={status.path} />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
