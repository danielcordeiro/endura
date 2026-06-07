'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

type Tab = 'login' | 'register';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, setAuth, isLoading, token: existingToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Redirect se já autenticado
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated() && existingToken) {
      router.replace('/dashboard');
    }
  }, [existingToken, router]);

  // Captura tokens da URL após login via Strava OAuth (fragment ou query params)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try fragment first (new flow)
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const callbackToken = params.get('token');
      if (callbackToken) {
        try {
          const payload = JSON.parse(atob(callbackToken.split('.')[1]!));
          setAuth(
            { id: payload.sub, email: payload.email ?? '', name: payload.name ?? null, role: payload.role ?? 'athlete' },
            callbackToken,
          );
        } catch {
          setAuth({ id: '', email: '', name: null, role: 'athlete' }, callbackToken);
        }
        window.history.replaceState(null, '', '/login');
        router.push('/dashboard');
        return;
      }
    }

    // Legacy flow: query params
    const stravaStatus = searchParams.get('strava');
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');

    if (stravaStatus === 'success' && token && userId) {
      setAuth(
        {
          id: userId,
          email: searchParams.get('email') ?? '',
          name: searchParams.get('name') || null,
          role: searchParams.get('role') ?? 'athlete',
        },
        token,
      );
      router.push('/dashboard');
    }
  }, [searchParams, setAuth, router]);

  function validateLogin(): boolean {
    const errs: FormErrors = {};
    if (!email.trim()) errs.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (!password) errs.password = 'Senha obrigatória';
    else if (password.length < 6) errs.password = 'Mínimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateRegister(): boolean {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    if (!email.trim()) errs.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (!password) errs.password = 'Senha obrigatória';
    else if (password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Senhas não conferem';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!validateLogin()) return;
    setErrors({});
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Erro ao fazer login';
      setErrors({ general: message });
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!validateRegister()) return;
    setErrors({});
    try {
      await register(email, password, name);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Erro ao criar conta';
      setErrors({ general: message });
    }
  }

  const [stravaLoading, setStravaLoading] = useState(false);

  async function handleStravaLogin() {
    setStravaLoading(true);
    // Wake up the API first (Render free tier may be sleeping)
    // Wait until we get a JSON response (not HTML loading page)
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch(`${API_URL}/health`);
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) break; // API is awake
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    window.location.href = `${API_URL}/api/auth/strava`;
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setErrors({});
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }

  const inputClass =
    'w-full h-14 px-5 bg-bg-surface border border-border-strong/50 rounded-2xl text-text-primary placeholder:text-text-muted text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="w-full max-w-[400px] animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <span className="relative flex items-center justify-center">
            <span className="absolute inset-0 -m-2 rounded-full bg-primary/20 blur-lg" aria-hidden="true" />
            <span className="material-symbols-outlined relative text-primary text-4xl">bolt</span>
          </span>
          <h1 className="font-bold text-[48px] leading-none text-text-primary tracking-tight">
            ENDURA
          </h1>
        </div>
        <p className="text-text-secondary text-sm">
          Performance para triatletas
        </p>
      </div>

      {/* Tab Toggle — segmented pill */}
      <div className="segmented mb-8 h-12" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'login'}
          onClick={() => switchTab('login')}
          data-active={activeTab === 'login'}
          className="segmented-item"
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'register'}
          onClick={() => switchTab('register')}
          data-active={activeTab === 'register'}
          className="segmented-item"
        >
          Criar conta
        </button>
      </div>

      {/* Error banner */}
      {errors.general && (
        <div className="mb-4 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[13px] flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">error</span>
          {errors.general}
        </div>
      )}

      {/* Login Form */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.email}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.password}</p>
            )}
          </div>
          <Button type="submit" fullWidth loading={isLoading}>
            Entrar
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border-strong/50" />
            <span className="text-text-muted text-xs uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border-strong/50" />
          </div>

          {/* Strava OAuth */}
          <Button
            type="button"
            variant="strava"
            fullWidth
            onClick={handleStravaLogin}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Entrar com Strava
          </Button>
        </form>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.name}</p>
            )}
          </div>
          <div>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.email}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.password}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-danger text-[12px] pl-1">{errors.confirmPassword}</p>
            )}
          </div>
          <Button type="submit" fullWidth loading={isLoading}>
            Criar Conta
          </Button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
