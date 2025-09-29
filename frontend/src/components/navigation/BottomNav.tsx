import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@utils/cn';

interface BottomNavItem {
  label: string;
  path: string;
  exact?: boolean;
  Icon: React.FC<{ className?: string }>;
}

const ActivitiesIcon: BottomNavItem['Icon'] = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    height="24"
    viewBox="0 0 256 256"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M244,136v40a16,16,0,0,1-16,16H28a16,16,0,0,1-16-16V56A16,16,0,0,1,28,40H80a8,8,0,0,1,0,16H36v3.31l39.51-26.34a8,8,0,0,1,9.8,0L128,58.35l40.09-32.07a8,8,0,0,1,10.13-.25l48,32A8,8,0,0,1,232,64V56a8,8,0,0,1,16,0v80Zm-12,40V152.69l-42.13-28.09a8,8,0,0,0-9.74,0L128,197.65l-42.13-35.11a8,8,0,0,0-9.8,0L36,190.69V176a8,8,0,0,0-16,0v16a8,8,0,0,0,2.1,5.1l.14.15,59.51-49.59a8,8,0,0,1,9.52-.51l43,28.69,43.41-36.18a8,8,0,0,1,10.24,12.3l-48,40a8,8,0,0,1-9.56.51l-43-28.69L43.83,168H220a8,8,0,0,0,8-8V136a8,8,0,0,1,16,0Z" />
  </svg>
);

const WorkoutIcon: BottomNavItem['Icon'] = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    height="24"
    viewBox="0 0 256 256"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M208.06,184H152a8,8,0,0,0-8,8v12a36,36,0,0,0,72.05,0V192A8,8,0,0,0,208.06,184Zm-8,20a20,20,0,0,1-40,0v-4h40ZM104,160h-56a8,8,0,0,0-8,8v12A36,36,0,0,0,112,180V168A8,8,0,0,0,104,160Zm-8,20a20,20,0,0,1-40,0v-4H96ZM76,16C64.36,16,53.07,26.31,44.2,45c-13.93,29.38-18.56,73,.29,96a8,8,0,0,0,6.2,2.93h50.55a8,8,0,0,0,6.2-2.93c18.85-23,14.22-66.65.29-96C98.85,26.31,87.57,16,76,16ZM97.15,128H54.78c-11.4-18.1-7.21-52.7,3.89-76.11C65.14,38.22,72.17,32,76,32s10.82,6.22,17.3,19.89C104.36,75.3,108.55,109.9,97.15,128Zm57.61,40h50.55a8,8,0,0,0,6.2-2.93c18.85-23,14.22-66.65.29-96C202.93,50.31,191.64,40,180,40s-22.89,10.31-31.77,29c-13.93,29.38-18.56,73,.29,96A8.05,8.05,0,0,0,154.76,168Zm8-92.11C169.22,62.22,176.25,56,180,56s10.82,6.22,17.29,19.89c11.1,23.41,15.29,58,3.9,76.11H158.85C147.45,133.9,151.64,99.3,162.74,75.89Z" />
  </svg>
);

const SupplementsIcon: BottomNavItem['Icon'] = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    height="24"
    viewBox="0 0 256 256"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z" />
  </svg>
);

const navItems: BottomNavItem[] = [
  {
    label: 'Atividades',
    path: '/dashboard',
    exact: true,
    Icon: ActivitiesIcon,
  },
  {
    label: 'Treinos',
    path: '/workouts',
    Icon: WorkoutIcon,
  },
  {
    label: 'Suplementos',
    path: '/supplements',
    Icon: SupplementsIcon,
  },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="sticky bottom-0 left-0 right-0 border-t border-border-light bg-card-light/95 shadow-lg backdrop-blur-sm dark:border-border-dark dark:bg-card-dark/90">
      <div className="flex justify-around px-4 py-2">
        {navItems.map(({ label, path, Icon, exact }) => {
          const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);

          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-foreground-muted-light hover:text-primary dark:text-foreground-muted-dark'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive ? 'text-primary' : undefined)} />
              <span className={cn('text-xs font-medium', isActive ? 'font-bold' : undefined)}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
