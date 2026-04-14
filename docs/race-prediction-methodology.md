# Race Prediction IM 70.3 — Metodologia

## Visao Geral

A previsao de tempo para Ironman 70.3 calcula splits para cada disciplina (swim/bike/run) mais transicoes, baseado nos dados reais de treino do atleta.

## Distancias IM 70.3

| Segmento | Distancia |
|---|---|
| Swim | 1.900m |
| T1 | ~5min (fixo) |
| Bike | 90km |
| T2 | ~3min (fixo) |
| Run | 21.1km |

## Fontes de Dados (por prioridade)

### 1. Atividades Strava (ultimos 180 dias) — fonte primaria
Todas as atividades sincronizadas do Strava sao usadas para calcular paces e velocidades medias reais do atleta.

### 2. Testes de Fitness (T30, FTP, Cooper) — alimentam o perfil
Ao registrar um teste, os valores derivados sao salvos no perfil do atleta:
- **FTP 20min** → `athlete_profiles.ftp_watts` (95% da potencia media)
- **Cooper 12min** → `athlete_profiles.run_5k_pace_sec` (pace estimado para 5k)
- **T30 Natacao** → pace derivado (usado se nao houver atividades de swim)

### 3. Perfil do Atleta — fallback quando nao ha atividades
Se nao houver atividades suficientes de uma disciplina, o sistema usa os dados do perfil:
- `ftp_watts` para estimar velocidade no bike
- `run_5k_pace_sec` para estimar pace na corrida
- `level` (iniciante/intermediario/competitivo) para estimativas genericas

## Calculos por Disciplina

### Swim (1.900m)

**Com atividades de natacao:**
```
swimPace100m = media(duracao / distancia * 100) de todos os treinos de swim
swimTime = (1900 / 100) * swimPace100m
```

**Sem atividades (fallback por nivel):**
- Competitivo: 1:45/100m
- Intermediario: 2:00/100m
- Iniciante: 2:20/100m

### Bike (90km)

**Com atividades de bike:**
```
bikeSpeedKmh = media(distancia_km / duracao_h) * 0.95 (fator fadiga prova)
```

**Com FTP (do teste ou perfil):**
```
bikeSpeedKmh = 28 + (FTP - 200) * 0.05
```

**Ajuste de altimetria (quando cadastrada):**
```
penaltyFactor = 1 + (elevationGainM / distanciaM) * 8
bikeSpeedAjustada = bikeSpeedKmh / penaltyFactor
```
Exemplo: 800m D+ em 90km → velocidade cai ~7%

**Sem dados (fallback por nivel):**
- Competitivo: 32 km/h
- Intermediario: 28 km/h
- Iniciante: 24 km/h

### Run (21.1km)

**Com atividades de corrida:**
```
runPaceKm = media(duracao / distancia * 1000) * 1.08 (fator brick pos-bike)
```

**Com pace 5k (do Cooper ou perfil):**
```
runPaceKm = (run5kPaceSec / 5) * 1.15 (ajuste 5k → meia maratona)
```

**Ajuste de altimetria (quando cadastrada):**
```
effectiveElevation = elevationGainM * 0.67 (subida custa 100%, descida recupera 33%)
adjustmentFactor = 1 + (effectiveElevation / 400)
runPaceAjustado = runPaceKm * adjustmentFactor
```
Exemplo: 400m D+ → pace sobe ~4.5% (de 5:00 para ~5:13/km)

### Transicoes

| Transicao | Tempo fixo |
|---|---|
| T1 (swim→bike) | 5:00 |
| T2 (bike→run) | 3:00 |

## Confianca (0-100%)

A confianca da previsao depende da quantidade de dados disponiveis:

| Fator | Bonus |
|---|---|
| Base | 30% |
| >= 3 treinos de swim | +15% |
| >= 1 treino de swim | +8% |
| >= 5 treinos de bike | +20% |
| >= 2 treinos de bike | +10% |
| >= 5 treinos de run | +20% |
| >= 2 treinos de run | +10% |
| CTL > 50 | +15% |
| CTL > 30 | +8% |
| Altimetria bike cadastrada | +3% |
| Altimetria run cadastrada | +2% |
| Maximo | 95% |

## Quando a previsao e recalculada

A previsao e recalculada **a cada requisicao** ao endpoint `/api/performance/dashboard`. Nao e cacheada — sempre reflete os dados mais recentes.

Isso significa que:
- Novos treinos sincronizados do Strava atualizam a previsao na proxima vez que o dashboard e carregado
- Testes de fitness atualizam o perfil imediatamente, e a previsao usa esses dados como fallback
- Altimetria cadastrada na prova alvo ajusta os splits na hora

## Limitacoes

1. **Sem dados de potencia na natacao** — usa pace medio, nao CSS (Critical Swim Speed)
2. **Transicoes fixas** — nao personaliza T1/T2 baseado no historico
3. **Sem ajuste de altitude** — apenas D+ do percurso, nao altitude absoluta da prova
4. **Fator brick simplificado** — usa 8% fixo ao inves de modelar fadiga acumulada
5. **Sem ajuste climatico** — calor/humidade podem impactar 5-15% no run
