'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { AlertBanner } from '@/components/ui/alert-banner';

type Tier = 'low' | 'medium' | 'high';

interface AeroTestLap {
  lapIndex: number;
  label: string | null;
  cdaM2: number;
  wattsAt40kmh: number;
  avgPowerW: number | null;
  fitRmseM: number;
  sampleSecs: number;
  speed: { minMs: number; maxMs: number; avgMs: number };
  deltaWattsVsBest: number;
}
interface AeroTestResult {
  crr: number;
  crrFromSetup: number | null;
  systemMassKg: number;
  riderWeightKg: number | null;
  bikeWeightKg: number;
  overall: { cdaM2: number; wattsAt40kmh: number; fitRmseM: number };
  laps: AeroTestLap[];
  bestLapIndex: number | null;
  confidence: { tier: Tier; score: number; reasons: string[] };
  usedDefaults: boolean;
}

const TIER: Record<Tier, { label: string; color: string; dim: string; dot: string }> = {
  high: { label: 'Alta confiança', color: 'text-success', dim: 'bg-success-dim', dot: 'bg-success' },
  medium: { label: 'Média confiança', color: 'text-warning', dim: 'bg-warning-dim', dot: 'bg-warning' },
  low: { label: 'Baixa confiança', color: 'text-danger', dim: 'bg-danger-dim', dot: 'bg-danger' },
};

function ProtocolHelp() {
  return (
    <ul className="space-y-1.5 text-[12.5px] text-text-secondary">
      {[
        'Trecho plano, reto e tranquilo (~1–2 km) — ou um loop plano.',
        'Faça ida-e-volta por posição — isso cancela o vento.',
        'Segure um esforço constante e moderado (nada de sprint) e não pare no meio.',
        'Vento calmo (manhã cedo é ideal).',
        'Mude UMA coisa por vez (posição / capacete / roupa) e marque cada volta como um lap no ciclocomputador.',
      ].map((t) => (
        <li key={t} className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[15px] leading-[19px] text-bike">check_circle</span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function AeroTestSection({ activityId }: { activityId: string }) {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  const testQuery = useQuery<{ data: AeroTestResult | null }>({
    queryKey: ['aero-test', activityId],
    queryFn: () => apiFetch<{ data: AeroTestResult | null }>(`/api/activities/${activityId}/aero-test`, { token: token ?? undefined }),
    enabled: !!token,
  });
  const test = testQuery.data?.data ?? null;

  useEffect(() => {
    if (test) setLabels(Object.fromEntries(test.laps.map((l) => [l.lapIndex, l.label ?? ''])));
  }, [test]);

  const runMutation = useMutation({
    mutationFn: () => apiFetch(`/api/activities/${activityId}/aero-test`, { method: 'POST', token: token ?? undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aero-test', activityId] }),
  });

  const labelsMutation = useMutation({
    mutationFn: () => apiFetch(`/api/activities/${activityId}/aero-test/labels`, {
      method: 'PUT', token: token ?? undefined,
      body: JSON.stringify({ labels: Object.entries(labels).map(([k, v]) => ({ lapIndex: Number(k), label: v.trim() || null })) }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aero-test', activityId] }),
  });

  const dirty = test ? test.laps.some((l) => (labels[l.lapIndex] ?? '') !== (l.label ?? '')) : false;
  const multi = (test?.laps.length ?? 0) > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-bike">wind_power</span>
          <h2 className="font-heading font-semibold text-lg text-text-primary">Teste Aero</h2>
        </div>
        <button onClick={() => setShowHelp((s) => !s)} className="text-[12px] text-text-muted hover:text-text-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">help</span>Como fazer
        </button>
      </div>

      {showHelp && (
        <div className="rounded-card border border-border bg-bg-surface p-4">
          <ProtocolHelp />
        </div>
      )}

      {/* Sem teste ainda → convite + protocolo */}
      {!test && !testQuery.isLoading && (
        <div className="rounded-card border border-border bg-bg-surface p-4 space-y-3">
          <p className="text-[13px] text-text-secondary">
            Mede seu <span className="text-text-primary font-semibold">CdA e Crr reais</span> pelo método Chung
            (virtual elevation) e compara posições — fazendo uma volta por posição num trecho plano.
          </p>
          <ProtocolHelp />
          {runMutation.isError && (
            <AlertBanner variant="danger">
              {(runMutation.error as { message?: string })?.message ?? 'Não deu pra analisar.'}
            </AlertBanner>
          )}
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="w-full h-12 rounded-full bg-bike text-white font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {runMutation.isPending ? 'Analisando…' : 'Analisar como Teste Aero'}
          </button>
        </div>
      )}

      {/* Resultado */}
      {test && (
        <div className="space-y-4">
          {/* Cabeçalho: CdA/Crr do teste + confiança */}
          <div className="rounded-card border border-border bg-bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Resultado do teste</span>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', TIER[test.confidence.tier].dim, TIER[test.confidence.tier].color)}>
                <span className={cn('h-2 w-2 rounded-full', TIER[test.confidence.tier].dot)} />
                {TIER[test.confidence.tier].label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="font-[var(--font-mono)] font-bold text-2xl text-white leading-none">{test.overall.cdaM2.toFixed(3)}</div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mt-1">CdA m²</div>
              </div>
              <div className="text-center">
                <div className="font-[var(--font-mono)] font-bold text-2xl text-white leading-none">{test.crr.toFixed(4)}</div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Crr medido</div>
              </div>
              <div className="text-center">
                <div className="font-[var(--font-mono)] font-bold text-2xl text-white leading-none">{test.overall.wattsAt40kmh}</div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mt-1">W @ 40 km/h</div>
              </div>
            </div>
            {test.crrFromSetup != null && Math.abs(test.crrFromSetup - test.crr) > 0.0005 && (
              <p className="text-[11px] text-text-faint">
                Pneu cadastrado sugeria Crr {test.crrFromSetup.toFixed(4)} — o teste mediu {test.crr.toFixed(4)}.
              </p>
            )}
          </div>

          {/* Comparação de posições */}
          {multi && (
            <div className="rounded-card border border-border bg-bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Posições (por volta)</span>
                {dirty && (
                  <button
                    onClick={() => labelsMutation.mutate()}
                    disabled={labelsMutation.isPending}
                    className="text-[11px] font-bold text-primary hover:text-primary-bright disabled:opacity-50"
                  >
                    {labelsMutation.isPending ? 'Salvando…' : 'Salvar nomes'}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {test.laps.map((l) => {
                  const isBest = l.lapIndex === test.bestLapIndex;
                  return (
                    <div key={l.lapIndex} className={cn('rounded-xl border p-2.5 space-y-1.5', isBest ? 'border-success/40 bg-success-dim' : 'border-border bg-bg-input/40')}>
                      <div className="flex items-center gap-2">
                        <input
                          value={labels[l.lapIndex] ?? ''}
                          onChange={(e) => setLabels((s) => ({ ...s, [l.lapIndex]: e.target.value }))}
                          placeholder={`Posição ${l.lapIndex}`}
                          className="flex-1 min-w-0 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-faint"
                        />
                        {isBest && <span className="material-symbols-outlined text-[16px] text-success shrink-0">emoji_events</span>}
                        <span className={cn('font-[var(--font-mono)] text-[13px] font-bold shrink-0', l.deltaWattsVsBest === 0 ? 'text-success' : 'text-text-primary')}>
                          {l.deltaWattsVsBest === 0 ? 'melhor' : `+${l.deltaWattsVsBest}W`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-[var(--font-mono)] text-[11px] text-text-muted pl-0.5">
                        <span className="text-text-secondary">CdA {l.cdaM2.toFixed(3)} m²</span>
                        {l.avgPowerW != null && <span>{l.avgPowerW} W méd</span>}
                        <span>{(l.speed.avgMs * 3.6).toFixed(1)} km/h méd</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-text-faint">Δ em watts a 40 km/h vs a posição mais aero. Renomeie cada volta com a posição/equipamento testado.</p>
            </div>
          )}

          {/* Motivos / avisos */}
          {test.confidence.reasons.length > 0 && (
            <ul className="space-y-1 px-1">
              {test.confidence.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-[12px] text-text-muted">
                  <span className="material-symbols-outlined text-[14px] leading-[18px] text-text-faint">info</span>{r}
                </li>
              ))}
            </ul>
          )}

          {/* Rodapé: setup + re-rodar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-text-faint">
              massa {test.systemMassKg} kg · ajuste ±{test.overall.fitRmseM} m
            </span>
            <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="text-[11px] font-bold text-text-secondary hover:text-text-primary disabled:opacity-50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              {runMutation.isPending ? 'Recalculando…' : 'Recalcular'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
