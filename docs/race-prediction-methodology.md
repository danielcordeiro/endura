# Race Prediction IM 70.3 — Metodologia

## Visao Geral

A previsao usa **testes de fitness como base primaria** e **CTL + atividades Strava como calibracao**.

## Principio

O resultado dos testes (T30, FTP 20min, Cooper 12min) define a capacidade maxima do atleta. A prova e feita a 70-82% dessa capacidade, dependendo do condicionamento (CTL).

## Performance Factor (% do teste)

O CTL determina quanto do resultado do teste o atleta consegue sustentar numa prova longa:

| CTL | Fator | Interpretacao |
|---|---|---|
| < 30 | 70% | Baixo condicionamento, muita degradacao |
| 30-50 | 73% | Condicionamento basico |
| 50-70 | 76% | Bom condicionamento |
| 70-90 | 78% | Condicionamento avancado |
| 90-100 | 79% | Excelente |
| 100-120 | 80% | Elite amador |
| > 120 | 82% | Top performance |

**Natacao**: fator base + 8% (max 95%), porque a natacao degrada menos em distancia.

## Calibracao com Strava

Atividades dos ultimos 180 dias **ajustam ±5%** a previsao baseada no teste:
- Se o atleta treina mais rapido que o previsto → ajusta para cima (max +5%)
- Se treina mais devagar → ajusta para baixo (max -5%)
- Minimo de 2 atividades para calibrar

## Calculos por Disciplina

### Swim (1.900m) — Base: T30

```
testPace = (30min / distanciaT30) × 100     → pace/100m no teste
racePace = testPace / swimFactor             → pace de prova (mais lento)
racePace = calibrateWithStrava(racePace)     → ajuste ±5% com treinos reais
swimTime = (1900 / 100) × racePace
```

**Exemplo**: T30 = 1500m, CTL = 80
- testPace = 1800/1500 × 100 = 120 sec/100m (2:00/100m)
- swimFactor = 0.78 + 0.08 = 0.86
- racePace = 120 / 0.86 = 139 sec/100m (~2:19/100m)
- swimTime = 19 × 139 = 2641 sec (~44min)

### Bike (90km) — Base: FTP 20min

```
FTP = avgPower20min × 0.95
raceWatts = FTP × baseFactor               → potencia sustentavel na prova
bikeSpeed = 28 + (raceWatts - 200) × 0.05  → velocidade estimada
bikeSpeed = calibrateWithStrava(bikeSpeed)  → ajuste ±5%
bikeSpeed = adjustForElevation(bikeSpeed)   → penalidade D+
bikeTime = 90km / bikeSpeed × 3600
```

**Exemplo**: FTP teste = 250W avg → FTP = 237W, CTL = 100
- baseFactor = 0.80
- raceWatts = 237 × 0.80 = 190W
- bikeSpeed = 28 + (190-200) × 0.05 = 27.5 km/h
- bikeTime = 90/27.5 × 3600 = 11782 sec (~3:16)

### Run (21.1km) — Base: Cooper 12min

```
testPace = (12min / distanciaCooper) × 1000  → pace/km no Cooper
racePace = (testPace / baseFactor) × 1.05
           │                          └── brick factor 5% (correr pos-bike)
           └── ajuste condicionamento (ja captura degradacao 12min → 2h+)
racePace = calibrateWithStrava(racePace)      → ajuste ±5%
racePace = adjustForElevation(racePace)       → ajuste D+
runTime = 21.1 × racePace
```

**Exemplo**: Cooper = 2800m (pace teste 3:39/km = 219s), CTL = 100
- testPace = 720/2800 × 1000 = 257 sec/km (4:17/km)
- baseFactor = 0.80
- racePace = (257/0.80) × 1.05 = 337 sec/km (5:37/km)
- runTime = 21.1 × 337 = 7110 sec (~1:58)

**Exemplo**: Cooper = 3280m (pace teste 3:39/km = 219s), CTL = 76
- testPace = 720/3280 × 1000 = 219 sec/km (3:39/km)
- baseFactor = 0.78
- racePace = (219/0.78) × 1.05 = 295 sec/km (4:55/km)
- runTime = 21.1 × 295 = 6225 sec (~1:44)

> **Nota**: O baseFactor (70-82%) ja inclui a degradacao de performance
> de um esforco maximo de 12min para um esforco sustentado de 2h+.
> Nao ha penalty de distancia adicional.

### Transicoes

| Transicao | Tempo |
|---|---|
| T1 (swim→bike) | 5:00 |
| T2 (bike→run) | 3:00 |

## Ajuste de Altimetria

### Bike
```
penaltyFactor = 1 + (D+ / distancia) × 8
speedAjustada = speed / penaltyFactor
```

### Run (GAP Formula)
```
effectiveElevation = D+ × 0.67  (subida custa 100%, descida recupera 33%)
adjustmentFactor = 1 + (effectiveElevation / 400)
paceAjustado = pace × adjustmentFactor
```

## Confianca

| Fator | Bonus |
|---|---|
| Base | 20% |
| Teste T30 registrado | +15% |
| Teste FTP registrado | +15% |
| Teste Cooper registrado | +15% |
| ≥3 treinos swim Strava | +5% |
| ≥5 treinos bike Strava | +5% |
| ≥5 treinos run Strava | +5% |
| CTL > 80 | +10% |
| CTL > 50 | +5% |
| D+ bike cadastrado | +3% |
| D+ run cadastrado | +2% |
| **Maximo** | **95%** |

## Prioridade dos Dados

1. **Testes de fitness** → base do calculo (T30, FTP 20min, Cooper 12min)
2. **CTL** → determina % do teste (70-82%)
3. **Strava** → calibra ±5% baseado em treinos reais
4. **Perfil** → fallback quando nao ha testes nem atividades
5. **Altimetria** → ajuste final baseado no D+ da prova

## Quando a previsao muda

- Novo teste de fitness registrado → muda a base imediatamente
- CTL sobe/desce → muda o fator de performance
- Novas atividades sincronizadas → recalibra ±5%
- Altimetria cadastrada na prova → ajusta splits
- A previsao e recalculada a cada request (nao e cacheada)
