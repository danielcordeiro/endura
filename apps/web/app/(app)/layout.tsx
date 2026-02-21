import { BottomNav } from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-24">
      <main className="px-5 pt-[env(safe-area-inset-top)] max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
