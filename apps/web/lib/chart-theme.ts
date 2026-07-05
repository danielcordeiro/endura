/**
 * Ponte única entre os tokens de cor (app/globals.css @theme) e os
 * gráficos recharts. Recharts não resolve custom properties de forma
 * confiável em atributos SVG (stroke/fill), então os hex abaixo ficam
 * duplicados aqui — precisam continuar em sync com os tokens
 * --color-metric-fitness/fatigue/form/weight/load e os semânticos
 * (--color-danger, --color-warning, --color-success) sempre que a
 * paleta mudar.
 */

export const CHART_COLORS = {
  fitness: '#4c9af0', // --color-metric-fitness (CTL)
  fatigue: '#f0524e', // --color-metric-fatigue (ATL)
  form: '#2fd583', // --color-metric-form (TSB)
  weight: '#b48cf2', // --color-metric-weight
  load: '#38bdf2', // --color-metric-load
  danger: '#f0524e', // --color-danger
  warning: '#f5a524', // --color-warning
  success: '#2fd583', // --color-success
  info: '#4c9af0', // --color-info
} as const;

export const CHART_GRID = '#334155'; // --color-border-strong
export const CHART_TICK_FILL = '#64748b'; // --color-text-muted
export const CHART_AXIS_TICK = { fontSize: 10, fill: CHART_TICK_FILL };

export const CHART_TOOLTIP_CONTAINER: import('react').CSSProperties = {
  background: '#1e2a36', // --color-bg-elevated
  border: '1px solid #334155', // --color-border-strong
  borderRadius: 12,
  padding: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

export function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
