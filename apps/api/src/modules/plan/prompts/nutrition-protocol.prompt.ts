/**
 * Prompt para geracao de protocolo nutricional por treino via Claude.
 *
 * Recebe os dados do treino planejado e o perfil do atleta,
 * retorna system + user prompt para gerar o protocolo em JSON.
 */

// ── Tipos internos ──────────────────────────────────────────────

interface WorkoutData {
  discipline: string;
  title: string | null;
  durationMin: number | null;
  distanceM: number | null;
  intensityZone: string | null;
  structure: unknown;
}

interface AthleteNutritionProfile {
  weightKg: string | null;
  dietaryRestrictions: string[] | null;
  ownedProducts: string[] | null;
  giSensitivity: boolean | null;
  sweatRateHigh: boolean | null;
  crampsHistory: boolean | null;
}

// ── Funcao principal ────────────────────────────────────────────

export function buildNutritionProtocolPrompt(
  workout: WorkoutData,
  profile: AthleteNutritionProfile,
): { system: string; prompt: string } {
  const system = `Voce e um nutricionista esportivo especializado em triathlon com certificacao ISSN.
Sua funcao e prescrever protocolos nutricionais individualizados para treinos e provas de triathlon.

Regras:
- Prescreva itens nutricionais para 3 fases: pre (antes do treino), during (durante), post (apos).
- Considere a duracao, intensidade e disciplina do treino.
- Para treinos curtos (< 60 min) e baixa intensidade, a fase "during" pode ser apenas agua.
- Considere restricoes alimentares e sensibilidade gastrointestinal do atleta.
- Se o atleta tem produtos proprios, priorize esses produtos nas recomendacoes.
- Para atletas com taxa de suor alta ou historico de caibras, aumente sodio.
- Calcule as quantidades baseado no peso corporal quando informado.
- Carboidratos durante treino: 30-60g/h para treinos de 1-2h, 60-90g/h para treinos > 2h.

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.
O JSON deve seguir EXATAMENTE esta estrutura:

{
  "items": [
    {
      "phase": "pre|during|post",
      "minuteOffset": number,
      "productName": "nome do produto",
      "brand": "marca (opcional)",
      "quantity": number,
      "unit": "ml|g|un|scoop",
      "carbsG": number,
      "sodiumMg": number,
      "caffeineMg": number,
      "kcal": number
    }
  ],
  "totals": {
    "totalCarbsG": number,
    "totalSodiumMg": number,
    "totalCaffeineMg": number,
    "totalKcal": number
  }
}

Onde "minuteOffset" e relativo ao inicio do treino:
- Valores negativos = antes do treino (ex: -30 = 30 min antes)
- Valores positivos = durante ou apos o treino (ex: 0 = inicio, 30 = 30 min apos inicio)
- Para "post", use offsets apos a duracao total do treino`;

  // Formata a estrutura do treino
  const structureStr = workout.structure
    ? JSON.stringify(workout.structure, null, 2)
    : 'Nao detalhada';

  // Formata restricoes alimentares
  const restrictions = profile.dietaryRestrictions?.length
    ? profile.dietaryRestrictions.join(', ')
    : 'Nenhuma';

  // Formata produtos do atleta
  const ownedProducts = profile.ownedProducts?.length
    ? profile.ownedProducts.join(', ')
    : 'Nenhum informado';

  const prompt = `Gere o protocolo nutricional para o seguinte treino e perfil do atleta:

## Treino
- Disciplina: ${workout.discipline}
- Titulo: ${workout.title ?? 'Treino'}
- Duracao: ${workout.durationMin ?? 'N/A'} minutos
- Distancia: ${workout.distanceM ? `${workout.distanceM} metros` : 'N/A'}
- Zona de intensidade: ${workout.intensityZone ?? 'N/A'}
- Estrutura: ${structureStr}

## Perfil Nutricional do Atleta
- Peso: ${profile.weightKg ? `${profile.weightKg} kg` : 'Nao informado'}
- Restricoes alimentares: ${restrictions}
- Produtos que possui: ${ownedProducts}
- Sensibilidade gastrointestinal: ${profile.giSensitivity ? 'Sim' : 'Nao'}
- Taxa de suor elevada: ${profile.sweatRateHigh ? 'Sim' : 'Nao'}
- Historico de caibras: ${profile.crampsHistory ? 'Sim' : 'Nao'}

Gere o protocolo nutricional em formato JSON conforme a estrutura especificada.`;

  return { system, prompt };
}
