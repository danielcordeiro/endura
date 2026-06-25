'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import type { PMCForecastData } from './pmc-chart';

/* ────────────────────────────────────────────────────────────────
   Daily Cockpit — hero em bento grid (telemetria) que conta a
   "história do dia" num relance: recovery (anel), forma (TSB),
   alvo de carga, prova, e um briefing sintetizado do coach.
   Substitui a sensação de "pilha de cards iguais" por um painel
   composto e hierárquico.
   ──────────────────────────────────────────────────────────────── */

interface RecoveryData {
  score: number | null;
  band: 'green' | 'yellow' | 'red' | 'unknown';
  label: string;
}

interface Readiness {
  level: 'intense' | 'moderate' | 'light' | 'rest';
  score: number;
  loadTarget?: { tssLow: number; tssHigh: number; label: string };
  factors?: { tsbTrend?: 'rising' | 'falling' | 'stable' };
}

interface CockpitProps {
  userName: string | null;
  pmc: { currentCTL: number; currentATL: number; currentTSB: number; metrics: { tsb: number }[] };
  readiness: Readiness;
  forecast?: PMCForecastData | null;
  targetRace?: { raceName: string | null; raceDate: string; daysRemaining: number } | null;
}

const BAND_RING = { green: '#22c55e', yellow: '#f59e0b', red: '#f43f5e', unknown: '#64748b' } as const;
const BAND_TEXT = { green: 'text-emerald-400', yellow: 'text-amber-400', red: 'text-rose-400', unknown: 'text-slate-400' } as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Anel compacto com glow para o hero. */
function Ring({ score, color, size = 104 }: { score: number; color: string; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(Math.max(score, 0), 100) / 100);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff12" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset .7s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
    </svg>
  );
}

/** Sparkline da forma (TSB) — últimos N pontos, dá o ar de "telemetria". */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 96, h = 26;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

function buildBriefing(rec: RecoveryData | null, tsb: number, lt?: Readiness['loadTarget']): string {
  const parts: string[] = [];
  if (rec?.score != null) {
    const r = rec.band === 'green' ? 'corpo recuperado' : rec.band === 'yellow' ? 'recuperação parcial' : 'pouca recuperação';
    parts.push(`Recovery ${rec.score} — ${r}`);
  }
  if (tsb <= -20) parts.push('carregando fadiga de bloco, mas dentro do esperado');
  else if (tsb < -5) parts.push('forma negativa, em construção');
  else if (tsb > 15) parts.push('fresco e afiado');
  else parts.push('forma equilibrada');
  if (lt) parts.push(`alvo de hoje ${lt.tssLow}–${lt.tssHigh} TSS`);
  return parts.join(' · ') + '.';
}

export function DailyCockpit({ userName, pmc, readiness, forecast, targetRace }: CockpitProps) {
  const token = useAuthStore((s) => s.token);
  const { data: recovery } = useQuery<RecoveryData | null>({
    queryKey: ['recovery-score'],
    queryFn: async () => {
      const res = await apiFetch<{ data: RecoveryData | null }>('/api/performance/recovery', { token: token ?? undefined });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  const tsb = pmc.currentTSB;
  const tsbColor = tsb >= 0 ? '#22c55e' : '#f43f5e';
  const band = recovery?.band ?? 'unknown';
  const ringColor = BAND_RING[band];
  const sparkVals = pmc.metrics.slice(-14).map((m) => m.tsb);
  const lt = readiness.loadTarget;
  const trend = readiness.factors?.tsbTrend;
  const trendIcon = trend === 'rising' ? 'trending_up' : trend === 'falling' ? 'trending_down' : 'trending_flat';

  const peak = forecast?.peak;
  const peakDot = peak?.status === 'ideal' ? 'bg-emerald-400'
    : peak?.status === 'too_fatigued' ? 'bg-rose-400'
    : peak?.status === 'too_fresh' ? 'bg-sky-400' : 'bg-amber-400';

  return (
    <section aria-label="Resumo do dia" className="space-y-4">
      {/* ── Briefing strip ── */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary/15 via-bg-surface to-bg-surface ring-1 ring-primary/20 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">neurology</span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-0.5">
              {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </p>
            <p className="text-[13px] leading-snug text-text-primary/90">
              {buildBriefing(recovery ?? null, tsb, lt)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bento grid: recovery (alto) + forma + alvo ── */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        {/* Recovery hero — ocupa as 2 linhas */}
        <div
          className="row-span-2 relative overflow-hidden rounded-card bg-bg-surface ring-1 ring-hairline p-5 flex flex-col items-center justify-center"
          style={{ boxShadow: recovery?.score != null ? `inset 0 0 40px ${ringColor}14` : undefined }}
        >
          <div className="flex items-center gap-1.5 self-start mb-2">
            <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', `bg-current`, BAND_TEXT[band])} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Recuperação</span>
          </div>
          {recovery?.score != null ? (
            <>
              <div className="relative my-1">
                <Ring score={recovery.score} color={ringColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('font-mono text-3xl font-bold leading-none', BAND_TEXT[band])}>{recovery.score}</span>
                </div>
              </div>
              <span className={cn('text-xs font-semibold mt-1', BAND_TEXT[band])}>{recovery.label}</span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-text-faint mb-1">ecg_heart</span>
              <span className="text-[11px] text-text-muted">Sincronize o wellness</span>
            </div>
          )}
        </div>

        {/* Forma (TSB) */}
        <div className="rounded-card bg-bg-surface ring-1 ring-hairline p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Forma</span>
            <span className="material-symbols-outlined text-base text-text-faint">{trendIcon}</span>
          </div>
          <div className="flex items-end justify-between gap-1 mt-1">
            <span className="font-mono text-2xl font-bold leading-none" style={{ color: tsbColor }}>
              {tsb >= 0 ? '+' : ''}{tsb.toFixed(0)}
            </span>
            <Sparkline values={sparkVals} color={tsbColor} />
          </div>
          <span className="text-[10px] text-text-muted mt-1">TSB · CTL {pmc.currentCTL.toFixed(0)}</span>
        </div>

        {/* Alvo de hoje (strain target) */}
        <div className="rounded-card bg-bg-surface ring-1 ring-hairline p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Alvo de hoje</span>
          {lt ? (
            <>
              <span className="font-mono text-2xl font-bold text-primary leading-none mt-1">
                {lt.tssLow}<span className="text-text-faint">–</span>{lt.tssHigh}
                <span className="text-[10px] text-text-muted font-normal ml-1">TSS</span>
              </span>
              <span className="text-[10px] text-text-muted mt-1 truncate">{lt.label}</span>
            </>
          ) : (
            <span className="font-mono text-xl text-text-faint mt-2">—</span>
          )}
        </div>
      </div>

      {/* ── Race strip ── */}
      {targetRace && (
        <div className="rounded-card bg-bg-surface ring-1 ring-hairline px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-lg shrink-0">flag</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate leading-tight">{targetRace.raceName || 'Prova-alvo'}</p>
            {peak && (
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', peakDot)} />
                {forecast?.peak.status === 'ideal' ? 'no pico certo'
                  : forecast?.peak.status === 'too_fatigued' ? 'risco de fadiga'
                  : forecast?.peak.status === 'too_fresh' ? 'forma na mesa'
                  : forecast?.peak.status === 'building' ? 'em construção' : 'projeção'}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-2xl font-bold text-primary leading-none">{targetRace.daysRemaining}</p>
            <p className="text-[9px] uppercase tracking-wider text-text-muted">dias</p>
          </div>
        </div>
      )}
    </section>
  );
}
