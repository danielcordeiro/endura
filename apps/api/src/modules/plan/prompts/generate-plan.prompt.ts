/**
 * Prompt para geracao de plano de treino completo via Claude.
 *
 * Recebe o perfil do atleta e a prova alvo, retorna system + user prompt
 * para gerar um plano de treino periodizado em JSON.
 */

// ── Tipos internos para os parametros ───────────────────────────

interface AthleteProfile {
  level: string;
  weakestDiscipline: string | null;
  weeklyHours: string | null;
  availableDays: number[] | null;
  hasPool: boolean | null;
  hasBikeTrainer: boolean | null;
  hasTreadmill: boolean | null;
  weightKg: string | null;
  heightCm: number | null;
  maxHr: number | null;
  ftpWatts: number | null;
  run5kPaceSec: number | null;
  dietaryRestrictions: string[] | null;
  ownedProducts: string[] | null;
  giSensitivity: boolean | null;
  sweatRateHigh: boolean | null;
  crampsHistory: boolean | null;
}

interface RaceGoal {
  distance: string;
  raceDate: string;
  goal: string;
  targetTime: number | null;
  raceName: string | null;
}

// ── Funcao principal ────────────────────────────────────────────

export function buildGeneratePlanPrompt(
  profile: AthleteProfile,
  raceGoal: RaceGoal,
): { system: string; prompt: string } {
  const system = `Voce e um treinador de triathlon de elite com certificacao USAT Level 3 e mestrado em fisiologia do exercicio.
Sua funcao e gerar planos de treino individualizados, cientificamente fundamentados, para triatletas de todos os niveis.

Regras:
- Gere um plano de treino completo desde hoje ate a data da prova.
- O plano deve seguir periodizacao classica com fases: base, build, peak e taper.
- Cada semana deve conter treinos distribuidos nos dias disponiveis do atleta.
- Respeite o volume semanal maximo em horas.
- Considere os equipamentos disponiveis (piscina, rolo, esteira).
- Intensifique trabalhos na disciplina mais fraca do atleta.
- Use zonas de intensidade padrao: Z1 (recovery), Z2 (endurance), Z3 (tempo), Z4 (threshold), Z5 (VO2max).
- Calcule TSS estimado para cada treino.
- Datas devem estar no formato YYYY-MM-DD.
- A primeira semana comeca na proxima segunda-feira a partir de hoje.
- A fase taper deve ter de 1 a 3 semanas dependendo da distancia da prova.

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional antes ou depois.
O JSON deve seguir EXATAMENTE esta estrutura:

{
  "phases": [
    {
      "name": "base|build|peak|taper",
      "startWeek": number,
      "endWeek": number,
      "weeks": [
        {
          "weekNumber": number,
          "workouts": [
            {
              "scheduledDate": "YYYY-MM-DD",
              "discipline": "swim|bike|run|brick",
              "title": "string",
              "durationMin": number,
              "distanceM": number,
              "intensityZone": "Z1|Z2|Z3|Z4|Z5",
              "structure": {
                "warmup": "descricao do aquecimento",
                "main": "descricao do bloco principal",
                "cooldown": "descricao do desaquecimento"
              },
              "tssEstimate": number
            }
          ]
        }
      ]
    }
  ]
}`;

  // Calcula semanas ate a prova
  const today = new Date();
  const raceDate = new Date(raceGoal.raceDate);
  const diffMs = raceDate.getTime() - today.getTime();
  const weeksUntilRace = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));

  // Formata dias disponiveis como nomes
  const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  const availableDaysStr = profile.availableDays
    ? profile.availableDays.map((d) => dayNames[d] ?? `Dia ${d}`).join(', ')
    : 'Todos os dias';

  // Formata pace de corrida
  const run5kPace = profile.run5kPaceSec
    ? `${Math.floor(profile.run5kPaceSec / 60)}:${String(profile.run5kPaceSec % 60).padStart(2, '0')} min/km`
    : 'Nao informado';

  // Formata tempo alvo
  const targetTimeStr = raceGoal.targetTime
    ? formatTime(raceGoal.targetTime)
    : 'Apenas completar';

  const prompt = `Gere um plano de treino completo para o seguinte atleta e prova:

## Perfil do Atleta
- Nivel: ${profile.level}
- Disciplina mais fraca: ${profile.weakestDiscipline ?? 'Nao informada'}
- Horas semanais disponiveis: ${profile.weeklyHours ?? 'Nao informado'}h
- Dias disponiveis: ${availableDaysStr}
- Peso: ${profile.weightKg ? `${profile.weightKg} kg` : 'Nao informado'}
- Altura: ${profile.heightCm ? `${profile.heightCm} cm` : 'Nao informado'}
- FC Maxima: ${profile.maxHr ? `${profile.maxHr} bpm` : 'Nao informado'}
- FTP: ${profile.ftpWatts ? `${profile.ftpWatts} watts` : 'Nao informado'}
- Pace 5K: ${run5kPace}

## Equipamentos Disponiveis
- Piscina: ${profile.hasPool ? 'Sim' : 'Nao'}
- Rolo/trainer: ${profile.hasBikeTrainer ? 'Sim' : 'Nao'}
- Esteira: ${profile.hasTreadmill ? 'Sim' : 'Nao'}

## Prova Alvo
- Distancia: ${raceGoal.distance}
- Nome da prova: ${raceGoal.raceName ?? 'Nao informado'}
- Data da prova: ${raceGoal.raceDate}
- Objetivo: ${raceGoal.goal === 'time' ? 'Tempo alvo' : 'Completar a prova'}
- Tempo alvo: ${targetTimeStr}

## Informacoes de Planejamento
- Data de hoje: ${today.toISOString().split('T')[0]}
- Semanas ate a prova: ${weeksUntilRace}

Gere o plano em formato JSON conforme a estrutura especificada.`;

  return { system, prompt };
}

/**
 * Formata segundos em HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
