import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
};