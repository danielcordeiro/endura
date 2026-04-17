'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch, cn } from '@/lib/utils';
import { AlertBanner } from '@/components/ui/alert-banner';

interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
}

export function ApiKeysSection({ token }: { token: string | null | undefined }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const listQuery = useQuery<{ data: ApiKeyListItem[] }>({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<{ data: ApiKeyListItem[] }>('/api/auth/api-keys', { token: token ?? undefined }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ data: ApiKeyCreated }>('/api/auth/api-keys', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      setCreatedKey(res.data);
      setNewKeyName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/auth/api-keys/${id}`, {
        method: 'DELETE',
        token: token ?? undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const keys = listQuery.data?.data ?? [];
  const activeKeys = keys.filter((k) => !k.revokedAt);

  async function handleCopy(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          API Keys
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Gere chaves para acessar seus dados via API pública. Use em sistemas externos ou integre com LLMs.{' '}
        <a href="/docs/api" target="_blank" className="text-primary hover:underline">
          Ver documentação ↗
        </a>
      </p>

      {listQuery.isLoading && (
        <div className="rounded-2xl border border-slate-800/50 bg-[#1c262f] p-4 h-16 animate-pulse" />
      )}

      {activeKeys.length === 0 && !listQuery.isLoading && (
        <div className="rounded-2xl border border-slate-800/50 bg-[#1c262f] p-4 text-center">
          <span className="text-xs text-slate-500">Nenhuma API Key ativa</span>
        </div>
      )}

      {activeKeys.map((k) => (
        <div key={k.id} className="rounded-2xl border border-slate-800/50 bg-bg-surface p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl text-emerald-400">key</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-slate-100 truncate">{k.name}</p>
            <p className="font-mono text-[11px] text-slate-500 truncate">{k.prefix}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Criada {format(parseISO(k.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              {k.lastUsedAt ? ` · Usada ${format(parseISO(k.lastUsedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}` : ' · Nunca usada'}
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm(`Revogar API Key "${k.name}"? Esta acao nao pode ser desfeita.`)) {
                revokeMutation.mutate(k.id);
              }
            }}
            disabled={revokeMutation.isPending}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated border border-slate-700/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
            title="Revogar"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      ))}

      {createMutation.isError && (
        <AlertBanner variant="danger">Erro ao criar API Key.</AlertBanner>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6">
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15">
                <span className="material-symbols-outlined text-2xl text-emerald-400">key</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-100">Nova API Key</h2>
                <p className="text-xs text-slate-400">Escolha um nome descritivo (ex: "Home Assistant", "GPT")</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nome da chave"
                className="w-full h-12 bg-bg-input border border-slate-700 rounded-xl px-4 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none transition-colors"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setNewKeyName(''); }}
                  className="flex-1 h-14 rounded-full bg-bg-elevated text-slate-300 font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => newKeyName.trim() && createMutation.mutate(newKeyName.trim())}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="flex-1 h-14 rounded-full bg-primary text-white font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Criando...' : 'Gerar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Key Created Modal (shows plain key ONCE) ── */}
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-bg-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15">
                <span className="material-symbols-outlined text-2xl text-emerald-400">check_circle</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-100">API Key criada</h2>
                <p className="text-xs text-amber-400">Copie agora — ela NAO sera exibida novamente.</p>
              </div>
            </div>

            <div className="bg-bg-input border border-slate-700 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Nome</p>
              <p className="text-sm text-slate-100 mb-3">{createdKey.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Chave</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-emerald-300 break-all bg-black/40 rounded-lg px-3 py-2">
                  {createdKey.key}
                </code>
                <button
                  onClick={() => handleCopy(createdKey.key)}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shrink-0',
                    copied && 'bg-emerald-600',
                  )}
                  title={copied ? 'Copiado!' : 'Copiar'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-black/20 rounded-lg p-3">
              <p className="font-semibold text-slate-400 mb-1">Como usar:</p>
              <code className="font-mono text-[11px] block">
                curl -H "X-API-Key: {createdKey.key.substring(0, 20)}..." \<br />
                &nbsp;&nbsp;https://sua-api/api/v1/public/me
              </code>
            </div>

            <button
              onClick={() => setCreatedKey(null)}
              className="w-full h-12 rounded-full bg-bg-elevated text-slate-300 font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Entendi, ja copiei
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
