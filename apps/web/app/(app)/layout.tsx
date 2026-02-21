import { BottomNav } from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20">
      <main className="px-4 pt-[env(safe-area-inset-top)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
