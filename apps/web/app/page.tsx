import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4">
      <h1 className="font-heading text-5xl font-bold text-primary tracking-tight">
        ENDURA
      </h1>
      <p className="mt-3 text-text-secondary text-sm">
        Performance para triatletas
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-inverse transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
