'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

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
    'w-full h-14 px-5 bg-[#1c262f] border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 text-[15px] outline-none transition-colors focus:border-primary';

  return (
    <div className="w-full max-w-[400px] animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="material-symbols-outlined text-primary text-4xl">bolt</span>
          <h1 className="font-bold text-[48px] leading-none text-white tracking-tight">
            ENDURA
          </h1>
        </div>
        <p className="text-slate-400 text-sm">
          Performance para triatletas
        </p>
      </div>

      {/* Tab Toggle — segmented pill */}
      <div className="flex mb-8 bg-[#1c262f] border border-slate-700/50 rounded-full p-1.5 gap-1">
        <button
          type="button"
          onClick={() => switchTab('login')}
          className={`flex-1 h-11 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'login'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => switchTab('register')}
          className={`flex-1 h-11 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Criar conta
        </button>
      </div>

      {/* Error banner */}
      {errors.general && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-red-400">error</span>
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.email}</p>
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.password}</p>
            )}
          </div>
          <Button type="submit" fullWidth loading={isLoading}>
            Entrar
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-slate-500 text-xs uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-slate-700/50" />
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.name}</p>
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.email}</p>
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.password}</p>
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
              <p className="mt-1.5 text-red-400 text-[12px] pl-1">{errors.confirmPassword}</p>
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
