/**
 * Prompt para simulacao de nutricao race day via Claude.
 *
 * Recebe dados da prova, perfil do atleta e historico nutricional,
 * retorna system + user prompt para gerar o plano nutricional multi-disciplina em JSON.
 */

// ── Tipos internos ──────────────────────────────────────────────

interface AthleteProfile {
  weightKg: string | null;
  dietaryRestrictions: string[] | null;
  ownedProducts: string[] | null;
  giSensitivity: boolean | null;
  sweatRateHigh: boolean | null;
  crampsHistory: boolean | null;
}

interface RaceGoalData {
  distance: string;
  targetTime: number | null;
  raceName: string | null;
}

interface WeatherConditions {
  tempC?: number;
  humidity?: number;
  wind?: string;
}

interface NutritionHistoryEntry {
  discipline: string;
  carbsPerHour: string | null;
  sodiumPerHour: string | null;
  adverseEvents: string[] | null;
}

interface RaceSimulationInput {
  name: string;
  distance: string;
  targetTimeSec?: number;
  weatherConditions?: WeatherConditions;
  athleteProfile: AthleteProfile;
  raceGoal?: RaceGoalData | null;
  nutritionHistory: NutritionHistoryEntry[];
}

// ── Funcao principal ────────────────────────────────────────────

export function buildRaceSimulationPrompt(
  input: RaceSimulationInput,
): { system: string; prompt: string } {
  const system = `You are an elite sports nutritionist specializing in triathlon race day nutrition. Create detailed multi-discipline nutrition plans.

Your role is to create a comprehensive race day nutrition plan that covers all phases of a triathlon race: pre-race, swim, T1, bike, T2, and run.

Rules:
- Create a phase-by-phase plan with specific timing and products.
- Consider the athlete's owned products and prioritize them in recommendations.
- Account for GI sensitivity, sweat rate, and cramp history.
- Adjust sodium and fluid intake based on weather conditions (heat, humidity).
- For longer races (half/full Ironman), ensure adequate caloric intake with gradual carb loading.
- Caffeine should be strategically timed for the bike and run portions.
- Consider that nutrition absorption decreases during the run — use easily digestible sources.
- T1 and T2 phases are transitions — only quick-access nutrition should be planned here.
- Each item must specify product name, quantity, carbs, sodium, caffeine, and kcal.

Carbohydrate guidelines by distance:
- Sprint: 30-40g/h during bike, minimal during run
- Olympic: 40-60g/h during bike, 30-40g/h during run
- Half Ironman: 60-80g/h during bike, 40-60g/h during run
- Full Ironman: 80-100g/h during bike, 50-70g/h during run

IMPORTANT: Return ONLY valid JSON, no additional text.
The JSON must follow EXACTLY this structure:

{
  "phases": [
    {
      "discipline": "pre_race|swim|t1|bike|t2|run|post_race",
      "durationMin": number,
      "items": [
        {
          "minuteOffset": number,
          "productName": "product name",
          "brand": "brand (optional)",
          "quantity": number,
          "unit": "ml|g|un|scoop|tab",
          "carbsG": number,
          "sodiumMg": number,
          "caffeineMg": number,
          "kcal": number,
          "notes": "timing or usage notes (optional)"
        }
      ]
    }
  ],
  "totals": {
    "totalCarbsG": number,
    "totalSodiumMg": number,
    "totalCaffeineMg": number,
    "totalKcal": number
  },
  "notes": ["array of general tips and recommendations"],
  "riskFactors": ["array of warnings and risk factors to monitor"]
}

Where "minuteOffset" is relative to the start of each phase:
- 0 = start of the phase
- Positive values = minutes after phase start`;

  // Formata distancia
  const distanceLabel = formatDistance(input.distance);

  // Formata tempo alvo
  const targetTimeStr = input.targetTimeSec
    ? formatTime(input.targetTimeSec)
    : input.raceGoal?.targetTime
      ? formatTime(input.raceGoal.targetTime)
      : 'Nao definido';

  // Formata restricoes alimentares
  const restrictions = input.athleteProfile.dietaryRestrictions?.length
    ? input.athleteProfile.dietaryRestrictions.join(', ')
    : 'Nenhuma';

  // Formata produtos do atleta
  const ownedProducts = input.athleteProfile.ownedProducts?.length
    ? input.athleteProfile.ownedProducts.join(', ')
    : 'Nenhum informado';

  // Formata condicoes climaticas
  const weatherStr = input.weatherConditions
    ? formatWeather(input.weatherConditions)
    : 'Nao informadas';

  // Formata historico nutricional
  const historyStr = input.nutritionHistory.length > 0
    ? input.nutritionHistory
      .map((h) => {
        const parts = [`- ${h.discipline}`];
        if (h.carbsPerHour) parts.push(`carbs/h: ${h.carbsPerHour}g`);
        if (h.sodiumPerHour) parts.push(`sodium/h: ${h.sodiumPerHour}mg`);
        if (h.adverseEvents?.length) parts.push(`eventos adversos: ${h.adverseEvents.join(', ')}`);
        return parts.join(' | ');
      })
      .join('\n')
    : 'Nenhum historico disponivel';

  const prompt = `Create a complete race day nutrition plan for the following race and athlete profile:

## Race Details
- Name: ${input.name}
- Distance: ${distanceLabel}
- Target Time: ${targetTimeStr}
${input.raceGoal?.raceName ? `- Race Name: ${input.raceGoal.raceName}` : ''}

## Weather Conditions
${weatherStr}

## Athlete Profile
- Weight: ${input.athleteProfile.weightKg ? `${input.athleteProfile.weightKg} kg` : 'Not informed'}
- Dietary Restrictions: ${restrictions}
- Owned Products: ${ownedProducts}
- GI Sensitivity: ${input.athleteProfile.giSensitivity ? 'Yes' : 'No'}
- High Sweat Rate: ${input.athleteProfile.sweatRateHigh ? 'Yes' : 'No'}
- Cramp History: ${input.athleteProfile.crampsHistory ? 'Yes' : 'No'}

## Recent Nutrition History (from training)
${historyStr}

Generate the race day nutrition plan in the specified JSON format.`;

  return { system, prompt };
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDistance(distance: string): string {
  const distanceMap: Record<string, string> = {
    sprint: 'Sprint Triathlon (750m swim / 20km bike / 5km run)',
    olympic: 'Olympic Triathlon (1.5km swim / 40km bike / 10km run)',
    half: 'Half Ironman 70.3 (1.9km swim / 90km bike / 21.1km run)',
    full: 'Full Ironman 140.6 (3.8km swim / 180km bike / 42.2km run)',
  };

  return distanceMap[distance.toLowerCase()] ?? distance;
}

function formatTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}min`;
  }
  return `${minutes}min`;
}

function formatWeather(conditions: WeatherConditions): string {
  const parts: string[] = [];

  if (conditions.tempC !== undefined) {
    parts.push(`Temperature: ${conditions.tempC}°C`);
  }
  if (conditions.humidity !== undefined) {
    parts.push(`Humidity: ${conditions.humidity}%`);
  }
  if (conditions.wind) {
    parts.push(`Wind: ${conditions.wind}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Not informed';
}
