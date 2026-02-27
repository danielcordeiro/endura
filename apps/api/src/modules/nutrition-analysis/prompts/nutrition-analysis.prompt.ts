/**
 * Prompt para analise pos-treino de nutricao via Claude.
 *
 * Compara o que foi prescrito vs. o que foi efetivamente consumido,
 * identifica padroes e gera insights acionaveis.
 */

// ── Tipos internos ──────────────────────────────────────────────

interface AnalysisInput {
  workout: {
    discipline: string;
    title: string | null;
    durationMin: number | null;
    intensityZone: string | null;
  };
  prescribed: {
    items: unknown;
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  } | null;
  actual: {
    items: unknown;
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  } | null;
  metrics: {
    carbsPerHour: number;
    sodiumPerHour: number;
  };
  athleteWeight: string | null;
  historicalPatterns?: Array<{
    discipline: string;
    adherenceScore: number;
    carbsPerHour: number;
  }>;
}

// ── Funcao principal ────────────────────────────────────────────

export function buildNutritionAnalysisPrompt(
  input: AnalysisInput,
): { system: string; prompt: string } {
  const system = `You are a sports nutritionist analyzing post-workout nutrition execution vs prescription for endurance athletes. You analyze patterns and provide actionable insights.

Rules:
- Compare prescribed nutrition protocol with actual intake.
- Evaluate carbohydrate intake rate (g/h) against recommended ranges for the discipline and intensity.
- For workouts < 60 min, during-workout fueling is optional.
- For workouts 1-2h, target 30-60g carbs/hour.
- For workouts > 2h, target 60-90g carbs/hour.
- Sodium intake should be 300-600mg/hour for most athletes, higher for heavy sweaters.
- Consider the athlete's weight when evaluating intake adequacy.
- When a protocol was prescribed, compare adherence closely.
- When no protocol was prescribed, evaluate against general best practices.
- Identify recurring patterns from historical data when available.

IMPORTANT: Return ONLY the JSON, no additional text.
The JSON must follow EXACTLY this structure:

{
  "adherenceScore": 0-100,
  "insights": [
    {
      "category": "sub_fueling|over_fueling|timing|gi_tolerance|hydration",
      "severity": "info|warning|critical",
      "insight": "description of the finding",
      "recommendation": "actionable recommendation"
    }
  ],
  "patterns": [
    {
      "pattern": "description of recurring pattern",
      "frequency": "how often this pattern occurs",
      "recommendation": "actionable recommendation"
    }
  ],
  "summary": "2-3 sentence summary of the analysis"
}

Scoring guidelines for adherenceScore:
- 90-100: Excellent adherence, within 10% of targets
- 70-89: Good adherence, minor deviations
- 50-69: Moderate adherence, significant gaps
- 30-49: Poor adherence, major deviations
- 0-29: Very poor adherence or no data to compare
- If no protocol was prescribed, score based on general best practices for the workout type`;

  // Formata dados prescritos
  const prescribedStr = input.prescribed
    ? `- Total Carbs: ${input.prescribed.totalCarbsG}g
- Total Sodium: ${input.prescribed.totalSodiumMg}mg
- Total Caffeine: ${input.prescribed.totalCaffeineMg}mg
- Total Kcal: ${input.prescribed.totalKcal}
- Items: ${JSON.stringify(input.prescribed.items, null, 2)}`
    : 'No protocol was prescribed for this workout.';

  // Formata dados consumidos
  const actualStr = input.actual
    ? `- Total Carbs: ${input.actual.totalCarbsG}g
- Total Sodium: ${input.actual.totalSodiumMg}mg
- Total Caffeine: ${input.actual.totalCaffeineMg}mg
- Total Kcal: ${input.actual.totalKcal}
- Items: ${JSON.stringify(input.actual.items, null, 2)}`
    : 'No nutrition was logged for this workout.';

  // Formata historico
  const historyStr = input.historicalPatterns?.length
    ? input.historicalPatterns
        .map(
          (p) =>
            `- ${p.discipline}: adherence ${p.adherenceScore}%, carbs/h ${p.carbsPerHour}g`,
        )
        .join('\n')
    : 'No historical data available.';

  const prompt = `Analyze the post-workout nutrition for the following activity:

## Workout
- Discipline: ${input.workout.discipline}
- Title: ${input.workout.title ?? 'Workout'}
- Duration: ${input.workout.durationMin ?? 'N/A'} minutes
- Intensity Zone: ${input.workout.intensityZone ?? 'N/A'}

## Prescribed Nutrition Protocol
${prescribedStr}

## Actual Nutrition Intake
${actualStr}

## Execution Metrics
- Carbs per hour: ${input.metrics.carbsPerHour}g/h
- Sodium per hour: ${input.metrics.sodiumPerHour}mg/h

## Athlete Info
- Weight: ${input.athleteWeight ? `${input.athleteWeight} kg` : 'Not provided'}

## Historical Patterns (last 20 activities with scores)
${historyStr}

Analyze the nutrition execution and return the JSON analysis.`;

  return { system, prompt };
}
