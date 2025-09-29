import { Outlet } from 'react-router-dom';
import { BottomNav } from '@components/navigation/BottomNav';

export const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};
