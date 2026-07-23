// Formatadores compartilhados pela UI de análise de atividade (duração,
// pace, potência por duração de pico etc.) — TP/intervals.icu style.

/** segundos → "7:55" ou "1:02:15" */
export function formatClock(totalSec: number | null | undefined): string {
  if (totalSec == null || !isFinite(totalSec)) return '--';
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** duração de pico em segundos → rótulo curto: "5s", "30s", "1min", "1h30" */
export function formatPeakDurationLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = sec / 60;
    return Number.isInteger(m) ? `${m}min` : `${Math.round(m)}min`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

/** metros/s → "km/h" (1 casa decimal) */
export function msToKmh(ms: number | null | undefined): number | null {
  if (ms == null) return null;
  return Math.round(ms * 3.6 * 10) / 10;
}

/** segundos por km (a partir de velocidade m/s) → "4:32/km" */
export function speedToPaceLabel(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--';
  const secPerKm = 1000 / ms;
  // Arredonda o total ANTES de separar min/seg — arredondar min e seg
  // independentemente pode produzir "3:60" quando os segundos batem 59.5+
  // (o carry pro minuto nunca acontece nesse caminho).
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

/** tempo (segundos) pra cobrir uma distância-alvo → pace formatado */
export function bestEffortToPaceLabel(sec: number | null, targetDistanceM: number): string {
  if (sec == null || sec <= 0) return '--';
  const speedMs = targetDistanceM / sec;
  return speedToPaceLabel(speedMs);
}

export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || !isFinite(v)) return '--';
  return v.toFixed(decimals);
}

export function fmtSigned(v: number | null | undefined, decimals = 0): string {
  if (v == null || !isFinite(v)) return '--';
  const s = v.toFixed(decimals);
  return v > 0 ? `+${s}` : s;
}

export const RUN_PACE_TARGETS_M = [400, 1000, 1609, 5000, 10000];
export const SWIM_PACE_TARGETS_M = [100, 200, 400, 1000, 1500];
export const POWER_PEAK_DURATIONS_SEC = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1200, 1800, 2400, 3600, 5400];

export function labelForTargetDistance(m: number): string {
  if (m === 1609) return '1 milha';
  if (m >= 1000) return `${m / 1000}km`;
  return `${m}m`;
}
