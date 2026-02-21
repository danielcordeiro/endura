'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
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

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isLoading, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function validateLogin(): boolean {
    const errs: FormErrors = {};
    if (!email.trim()) errs.email = 'E-mail obrigatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail invalido';
    if (!password) errs.password = 'Senha obrigatoria';
    else if (password.length < 6) errs.password = 'Minimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateRegister(): boolean {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Nome obrigatorio';
    if (!email.trim()) errs.email = 'E-mail obrigatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail invalido';
    if (!password) errs.password = 'Senha obrigatoria';
    else if (password.length < 6) errs.password = 'Minimo 6 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Senhas nao conferem';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function checkProfileAndRedirect(authToken: string) {
    try {
      await apiFetch('/api/athlete/profile', { token: authToken });
      router.push('/dashboard');
    } catch {
      router.push('/onboarding');
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!validateLogin()) return;
    setErrors({});
    try {
      await login(email, password);
      const currentToken = useAuthStore.getState().token;
      if (currentToken) await checkProfileAndRedirect(currentToken);
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
      router.push('/onboarding');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Erro ao criar conta';
      setErrors({ general: message });
    }
  }

  function handleStravaLogin() {
    window.location.href = `${API_URL}/api/integrations/strava/authorize`;
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
    'w-full h-12 px-4 bg-bg-input border border-border rounded-md text-text-primary placeholder:text-text-muted font-body text-[15px] outline-none transition-colors focus:border-border-focus';

  return (
    <div className="w-full max-w-[400px] animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="font-heading font-bold text-[52px] leading-none text-primary tracking-tight">
          ENDURA
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          Performance para triatletas
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex mb-6 bg-bg-surface rounded-md p-1 gap-1">
        <button
          type="button"
          onClick={() => switchTab('login')}
          className={`flex-1 h-10 rounded-md text-sm font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'login'
              ? 'bg-bg-elevated text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchTab('register')}
          className={`flex-1 h-10 rounded-md text-sm font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'register'
              ? 'bg-bg-elevated text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Criar conta
        </button>
      </div>

      {/* Error banner */}
      {errors.general && (
        <div className="mb-4 p-3 rounded-md bg-danger-dim border border-danger text-danger text-[13px]">
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
              <p className="mt-1 text-danger text-[12px]">{errors.email}</p>
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
              <p className="mt-1 text-danger text-[12px]">{errors.password}</p>
            )}
          </div>
          <Button type="submit" fullWidth loading={isLoading}>
            Entrar
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
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
              <p className="mt-1 text-danger text-[12px]">{errors.name}</p>
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
              <p className="mt-1 text-danger text-[12px]">{errors.email}</p>
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
              <p className="mt-1 text-danger text-[12px]">{errors.password}</p>
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
              <p className="mt-1 text-danger text-[12px]">{errors.confirmPassword}</p>
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
