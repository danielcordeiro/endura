/**
 * Regras deterministicas para gerar protocolo de nutricao intratreino.
 * Sem IA, sem I/O. Input: treino + perfil. Output: items + totais.
 *
 * Heuristicas baseadas em recomendacoes ISSN / ACSM para nutricao esportiva.
 */

// ── Tipos ─────────────────────────────────────────────────────────

export interface IntraWorkoutInput {
  durationMin: number | null;
  discipline: string;          // run | bike | swim | brick | other
  intensityZone: string | null; // Z1..Z5 (opcional)
  // Perfil do atleta (tudo opcional; usa defaults conservadores)
  weightKg?: number | null;
  sweatRateHigh?: boolean | null;
  giSensitivity?: boolean | null;
  hotWeather?: boolean | null;
}

export interface IntraWorkoutItem {
  phase: 'during';
  minuteOffset: number;
  productName: string;
  quantity: number;
  unit: 'un' | 'ml' | 'g' | 'scoop';
  carbsG: number;
  sodiumMg: number;
  caffeineMg?: number;
  kcal: number;
}

export interface IntraWorkoutProtocol {
  items: IntraWorkoutItem[];
  totals: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  };
  rationale: string; // para debug / exibicao
}

// ── Constantes ────────────────────────────────────────────────────

/** Produto "gel" canonico. Ajustar se catalogo preferido existir. */
const GEL = { name: 'Gel esportivo', unit: 'un' as const, carbsG: 25, sodiumMg: 30, kcal: 100 };
/** Capsula de sal canonica. */
const SALT = { name: 'Capsula de sal', unit: 'un' as const, carbsG: 0, sodiumMg: 300, kcal: 0 };

// ── Helpers ───────────────────────────────────────────────────────

function pickCarbRate(durationMin: number, intensityZone: string | null): number {
  const zone = (intensityZone ?? '').toUpperCase();
  const isHighIntensity = zone === 'Z3' || zone === 'Z4' || zone === 'Z5';

  if (durationMin < 60 && !isHighIntensity) return 30;
  if (durationMin < 60) return 45; // curto mas intenso pede mais carb
  if (durationMin <= 120) return 45;
  if (durationMin <= 180) return 60;
  return 75;
}

function pickSodiumRate(sweatRateHigh: boolean, hotWeather: boolean): number {
  if (sweatRateHigh || hotWeather) return 700;
  return 500;
}

function pickCadence(giSensitivity: boolean): number {
  return giSensitivity ? 30 : 20;
}

function roundTo(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

// ── Funcao principal ──────────────────────────────────────────────

export function calculateIntraWorkoutProtocol(input: IntraWorkoutInput): IntraWorkoutProtocol {
  const duration = input.durationMin ?? 0;
  const zone = (input.intensityZone ?? '').toUpperCase();
  const isZ1orZ2Recovery = zone === 'Z1' || zone === 'Z2';

  // Caso especial: treino muito curto e leve — so agua
  if (duration < 45 && isZ1orZ2Recovery) {
    return {
      items: [],
      totals: { totalCarbsG: 0, totalSodiumMg: 0, totalCaffeineMg: 0, totalKcal: 0 },
      rationale: 'Treino curto em zona leve — hidratacao com agua e suficiente.',
    };
  }

  if (duration < 30) {
    return {
      items: [],
      totals: { totalCarbsG: 0, totalSodiumMg: 0, totalCaffeineMg: 0, totalKcal: 0 },
      rationale: 'Treino muito curto para exigir suplementacao intratreino.',
    };
  }

  const carbsPerHour = pickCarbRate(duration, input.intensityZone);
  const sodiumPerHour = pickSodiumRate(!!input.sweatRateHigh, !!input.hotWeather);
  const cadenceMin = pickCadence(!!input.giSensitivity);

  // Geracao de items — gel a cada cadencia
  const items: IntraWorkoutItem[] = [];
  const hours = duration / 60;

  // Quantidade alvo de gels com base em carbs/h
  const targetCarbs = carbsPerHour * hours;
  const gelsNeeded = Math.max(1, Math.round(targetCarbs / GEL.carbsG));

  // Distribui gels ao longo do treino (com margem inicial de cadencia)
  // Evita gel na ultima 10min (proximidade do fim)
  const effectiveDuration = Math.max(cadenceMin, duration - 10);
  const intervalo = gelsNeeded === 1
    ? Math.floor(duration / 2)
    : Math.floor(effectiveDuration / gelsNeeded);

  for (let i = 1; i <= gelsNeeded; i++) {
    items.push({
      phase: 'during',
      minuteOffset: intervalo * i,
      productName: GEL.name,
      quantity: 1,
      unit: GEL.unit,
      carbsG: GEL.carbsG,
      sodiumMg: GEL.sodiumMg,
      kcal: GEL.kcal,
    });
  }

  // Quantidade alvo de capsulas de sal
  const targetSodium = sodiumPerHour * hours;
  const sodiumFromGels = gelsNeeded * GEL.sodiumMg;
  const sodiumDelta = Math.max(0, targetSodium - sodiumFromGels);
  const saltsNeeded = Math.round(sodiumDelta / SALT.sodiumMg);

  if (saltsNeeded > 0) {
    // Distribui sais nos intervalos entre gels
    const saltInterval = Math.floor(duration / (saltsNeeded + 1));
    for (let i = 1; i <= saltsNeeded; i++) {
      items.push({
        phase: 'during',
        minuteOffset: roundTo(saltInterval * i + 5, 5), // offset 5min pra evitar colisao
        productName: SALT.name,
        quantity: 1,
        unit: SALT.unit,
        carbsG: 0,
        sodiumMg: SALT.sodiumMg,
        kcal: 0,
      });
    }
  }

  // Ordena por minuteOffset
  items.sort((a, b) => a.minuteOffset - b.minuteOffset);

  const totals = items.reduce(
    (acc, item) => {
      acc.totalCarbsG += item.carbsG * item.quantity;
      acc.totalSodiumMg += item.sodiumMg * item.quantity;
      acc.totalCaffeineMg += (item.caffeineMg ?? 0) * item.quantity;
      acc.totalKcal += item.kcal * item.quantity;
      return acc;
    },
    { totalCarbsG: 0, totalSodiumMg: 0, totalCaffeineMg: 0, totalKcal: 0 },
  );

  const rationale = `${carbsPerHour}g carb/h e ${sodiumPerHour}mg Na/h em ${duration}min (cadencia ${cadenceMin}min).`;

  return { items, totals, rationale };
}

// ── Adherence ─────────────────────────────────────────────────────

export interface AdherenceInput {
  prescribed: { productName: string; quantity: number; carbsG: number; sodiumMg: number }[];
  actual: { prescribedIndex: number; consumedQuantity: number; skipped?: boolean }[];
}

/**
 * Score 0-100 baseado em peso de carbs (60%) + sodio (40%).
 * Itens skipped contam como quantity=0.
 */
export function calculateAdherence(input: AdherenceInput): number {
  const prescribedCarbs = input.prescribed.reduce((a, i) => a + i.carbsG * i.quantity, 0);
  const prescribedSodium = input.prescribed.reduce((a, i) => a + i.sodiumMg * i.quantity, 0);

  let consumedCarbs = 0;
  let consumedSodium = 0;
  for (const actual of input.actual) {
    if (actual.skipped) continue;
    const prescribedItem = input.prescribed[actual.prescribedIndex];
    if (!prescribedItem) continue;
    const factor = actual.consumedQuantity / Math.max(prescribedItem.quantity, 1);
    consumedCarbs += prescribedItem.carbsG * prescribedItem.quantity * factor;
    consumedSodium += prescribedItem.sodiumMg * prescribedItem.quantity * factor;
  }

  const carbScore = prescribedCarbs > 0
    ? Math.min(1, consumedCarbs / prescribedCarbs)
    : 1;
  const sodiumScore = prescribedSodium > 0
    ? Math.min(1, consumedSodium / prescribedSodium)
    : 1;

  return Math.round((carbScore * 0.6 + sodiumScore * 0.4) * 100);
}
