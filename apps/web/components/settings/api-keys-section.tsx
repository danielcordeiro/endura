'use client';

import { useMemo, useState } from 'react';
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
  expiresAt: string | null;
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
  expiresAt: string | null;
  createdAt: string;
}

interface ScopesCatalog {
  scopes: string[];
  bundles: { coach: string[]; readOnly: string[] };
}

const SCOPE_LABELS: Record<string, { label: string; description: string; category: 'read' | 'write' }> = {
  'read:profile': { label: 'Perfil', description: 'Perfil, snapshot e provas', category: 'read' },
  'read:activities': { label: 'Atividades', description: 'Treinos executados, nutrição, insights, comentários', category: 'read' },
  'read:planned': { label: 'Planejados', description: 'Treinos planejados e protocolos prescritos', category: 'read' },
  'read:wellness': { label: 'Wellness', description: 'HRV, sono, PMC (CTL/ATL/TSB), readiness, fitness tests', category: 'read' },
  'read:catalog': { label: 'Catálogo', description: 'Catálogo de produtos e presets de suplementação', category: 'read' },
  'write:nutrition': { label: 'Suplementação', description: 'Registrar/atualizar consumo de produtos nos treinos', category: 'write' },
  'write:checkin': { label: 'Check-in/RPE', description: 'Check-in diário e feedback pós-treino', category: 'write' },
  'write:comments': { label: 'Comentários', description: 'Postar comentários em atividades', category: 'write' },
};

export function ApiKeysSection({ token }: { token: string | null | undefined }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const listQuery = useQuery<{ data: ApiKeyListItem[] }>({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<{ data: ApiKeyListItem[] }>('/api/auth/api-keys', { token: token ?? undefined }),
    enabled: !!token,
  });

  const scopesQuery = useQuery<{ data: ScopesCatalog }>({
    queryKey: ['api-keys-scopes'],
    queryFn: () => apiFetch<{ data: ScopesCatalog }>('/api/auth/api-keys/scopes', { token: token ?? undefined }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; scopes: string[]; expiresInDays: number | null }) =>
      apiFetch<{ data: ApiKeyCreated }>('/api/auth/api-keys', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(input),
      }),
    onSuccess: (res) => {
      setCreatedKey(res.data);
      setNewKeyName('');
      setSelectedScopes([]);
      setExpiresInDays(null);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/auth/api-keys/${id}`, { method: 'DELETE', token: token ?? undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const keys = listQuery.data?.data ?? [];
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const catalog = scopesQuery.data?.data;

  const readScopes = useMemo(() => (catalog?.scopes ?? []).filter((s) => s.startsWith('read:') && s !== 'read:all'), [catalog]);
  const writeScopes = useMemo(() => (catalog?.scopes ?? []).filter((s) => s.startsWith('write:') && s !== 'write:all'), [catalog]);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  function applyBundle(kind: 'coach' | 'readOnly') {
    if (!catalog) return;
    setSelectedScopes([...catalog.bundles[kind]]);
  }

  function resetCreateForm() {
    setNewKeyName('');
    setSelectedScopes([]);
    setExpiresInDays(null);
  }

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
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">API Keys</p>
        <button
          onClick={() => {
            resetCreateForm();
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
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
        <div key={k.id} className="rounded-2xl border border-slate-800/50 bg-bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-emerald-400">key</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-slate-100 truncate">{k.name}</p>
              <p className="font-mono text-[11px] text-slate-500 truncate">{k.prefix}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Criada {format(parseISO(k.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                {k.lastUsedAt ? ` · Usada ${format(parseISO(k.lastUsedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}` : ' · Nunca usada'}
                {k.expiresAt ? ` · Expira ${format(parseISO(k.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}` : ''}
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
          <div className="flex flex-wrap gap-1.5 mt-3 pl-[52px]">
            {k.scopes.map((s) => (
              <span
                key={s}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono',
                  s.startsWith('write:')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/40 text-slate-300 border border-slate-600/40',
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}

      {createMutation.isError && <AlertBanner variant="danger">Erro ao criar API Key.</AlertBanner>}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreate(false);
              resetCreateForm();
            }}
          />
          <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 max-h-[90dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15">
                <span className="material-symbols-outlined text-2xl text-emerald-400">key</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-100">Nova API Key</h2>
                <p className="text-xs text-slate-400">Nome descritivo + escopos de acesso</p>
              </div>
            </div>

            <div className="space-y-5">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nome da chave (ex: openclaw, Home Assistant)"
                className="w-full h-12 bg-bg-input border border-slate-700 rounded-xl px-4 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none transition-colors"
              />

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bundles</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyBundle('coach')}
                    className="flex-1 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/15 transition-colors"
                  >
                    Coach (full)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBundle('readOnly')}
                    className="flex-1 h-10 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 text-xs font-semibold hover:bg-slate-700/60 transition-colors"
                  >
                    Somente leitura
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Leitura</p>
                <div className="space-y-1.5">
                  {readScopes.map((s) => (
                    <ScopeCheckbox
                      key={s}
                      scope={s}
                      checked={selectedScopes.includes(s)}
                      onToggle={() => toggleScope(s)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-widest mb-2">Escrita</p>
                <div className="space-y-1.5">
                  {writeScopes.map((s) => (
                    <ScopeCheckbox
                      key={s}
                      scope={s}
                      checked={selectedScopes.includes(s)}
                      onToggle={() => toggleScope(s)}
                      tone="write"
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expiração</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Nunca', val: null },
                    { label: '30 dias', val: 30 },
                    { label: '90 dias', val: 90 },
                    { label: '365 dias', val: 365 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setExpiresInDays(opt.val)}
                      className={cn(
                        'h-10 rounded-lg text-xs font-semibold transition-colors border',
                        expiresInDays === opt.val
                          ? 'bg-primary/15 border-primary/50 text-primary'
                          : 'bg-bg-input border-slate-700 text-slate-400 hover:text-slate-200',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                  className="flex-1 h-14 rounded-full bg-bg-elevated text-slate-300 font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    newKeyName.trim() &&
                    selectedScopes.length > 0 &&
                    createMutation.mutate({
                      name: newKeyName.trim(),
                      scopes: selectedScopes,
                      expiresInDays,
                    })
                  }
                  disabled={!newKeyName.trim() || selectedScopes.length === 0 || createMutation.isPending}
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
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Escopos</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {createdKey.scopes.map((s) => (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono',
                      s.startsWith('write:')
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700/40 text-slate-300 border border-slate-600/40',
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
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
                  <span className="material-symbols-outlined text-xl">{copied ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-black/20 rounded-lg p-3">
              <p className="font-semibold text-slate-400 mb-1">Como usar:</p>
              <code className="font-mono text-[11px] block">
                curl -H "X-API-Key: {createdKey.key.substring(0, 20)}..." \
                <br />
                &nbsp;&nbsp;https://sua-api/api/v1/public/summary
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

function ScopeCheckbox({
  scope,
  checked,
  onToggle,
  tone = 'read',
}: {
  scope: string;
  checked: boolean;
  onToggle: () => void;
  tone?: 'read' | 'write';
}) {
  const meta = SCOPE_LABELS[scope];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
        checked
          ? tone === 'write'
            ? 'bg-amber-500/10 border-amber-500/40'
            : 'bg-emerald-500/10 border-emerald-500/40'
          : 'bg-bg-input border-slate-700 hover:border-slate-600',
      )}
    >
      <span
        className={cn(
          'mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0',
          checked
            ? tone === 'write'
              ? 'bg-amber-400 border-amber-400'
              : 'bg-emerald-400 border-emerald-400'
            : 'border-slate-500',
        )}
      >
        {checked && <span className="material-symbols-outlined text-[14px] text-black">check</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold', checked ? 'text-slate-100' : 'text-slate-300')}>
          {meta?.label ?? scope}
          <span className="font-mono text-[10px] text-slate-500 ml-1.5">{scope}</span>
        </p>
        {meta?.description && <p className="text-[11px] text-slate-500 leading-tight">{meta.description}</p>}
      </div>
    </button>
  );
}
