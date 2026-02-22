import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined text-primary text-5xl">bolt</span>
        <h1 className="font-bold text-[56px] leading-none text-white tracking-tight">
          ENDURA
        </h1>
      </div>
      <p className="text-slate-400 text-sm">
        Performance para triatletas
      </p>
      <div className="mt-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-all hover:bg-blue-600 active:scale-[0.98]"
        >
          Entrar
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </Link>
      </div>
    </main>
  );
}
