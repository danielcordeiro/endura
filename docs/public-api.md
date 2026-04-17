# Endura Public API

API pública read-only para consulta de dados de atletas. Autenticação via API Key por usuário.

**Base URL (produção):** `https://api.endura.app`
**Base URL (local):** `http://localhost:8080`
**Versão:** `v1`

---

## Autenticação

Toda rota pública exige uma API Key válida em **um** dos dois headers:

```http
X-API-Key: endura_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

ou

```http
Authorization: Bearer endura_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Gerando uma API Key

1. Acesse **Endura → Configurações → API Keys → Nova**
2. Dê um nome descritivo (ex: `"Home Assistant"`, `"GPT Nutricionista"`)
3. **Copie a chave no momento da criação** — ela NUNCA será exibida novamente.
4. Guarde em cofre seguro (env var, secret manager, etc).

### Revogando

`DELETE /api/auth/api-keys/:id` ou UI em Configurações → botão lixeira.

### Scopes

Todas as keys hoje têm scope `read:all` (leitura total dos próprios dados do usuário). Escopos granulares podem ser adicionados no futuro.

### Rate limit

Sem limite oficial no MVP. Um único usuário não deve exceder ~60 req/min.

---

## Envelope padrão de resposta

Sucesso:

```json
{ "data": { ... } }
```

Erro:

```json
{ "code": "ERR_*", "message": "...", "status": 4xx|5xx }
```

Códigos de erro comuns:

| Código | Status | Quando |
|---|---|---|
| `ERR_NO_API_KEY` | 401 | Header ausente |
| `ERR_INVALID_API_KEY` | 401 | Key inválida ou revogada |
| `ERR_INVALID_RANGE` | 400 | `from > to` |
| `ERR_VALIDATION` | 400 | UUID ou formato inválido |
| `ERR_NOT_FOUND` | 404 | Recurso não encontrado / não pertence ao usuário |

---

## Convenções

- **Datas puras** (sem hora): `YYYY-MM-DD` (ex: `2026-04-18`)
- **Timestamps**: ISO 8601 UTC (ex: `2026-04-17T14:35:47.000Z`)
- **Duração**: sempre em **segundos** em atividades, **minutos** em treinos planejados
- **Distância**: sempre em **metros**
- **Potência**: watts · **FC**: bpm · **Peso**: kg · **Temperatura**: °C
- **Disciplinas**: `run` | `bike` | `swim` | `other` | `brick`
- **Paginação**: `?limit=<1-200>&offset=<N>` (default `limit=50`, max `200`)
- **Ranges**: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (defaults variam por endpoint)

---

## Endpoints

### `GET /api/v1/public/me`

Perfil do atleta dono da API Key.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "atleta@example.com",
    "name": "Daniel Cordeiro",
    "role": "athlete",
    "createdAt": "2026-02-23T02:00:18.677Z",
    "profile": {
      "level": "intermediate",
      "weakestDiscipline": "swim",
      "weeklyHours": "8.0",
      "availableDays": [1,2,3,4,5,6],
      "weightKg": "72.5",
      "heightCm": 178,
      "vdot": null,
      "ftp": 230,
      "swimCss": null,
      "runThreshold": null
    }
  }
}
```

---

### `GET /api/v1/public/summary`

Snapshot conveniente para LLMs/dashboards: próximo treino, atividade de hoje, wellness recente, prova alvo.

**Response:**
```json
{
  "data": {
    "today": "2026-04-17",
    "nextPlannedWorkout": {
      "id": "uuid",
      "scheduledDate": "2026-04-18",
      "discipline": "run",
      "title": "Será que vai?",
      "durationMin": 63,
      "distanceM": 10911,
      "tssEstimate": 42.0
    },
    "todayActivity": {
      "id": "uuid",
      "discipline": "run",
      "title": "Corrida leve",
      "startedAt": "2026-04-17T10:00:00.000Z",
      "durationSec": 2700,
      "distanceM": 7500,
      "avgHr": 142,
      "calories": 520
    },
    "latestWellness": {
      "date": "2026-04-17",
      "hrvMs": 58.2,
      "restingHr": 48,
      "sleepScore": 82,
      "readinessScore": 76,
      "readinessLevel": "moderate",
      "ctl": 48.3,
      "atl": 52.1,
      "tsb": -3.8
    },
    "activeRace": {
      "id": "uuid",
      "raceName": "IM 70.3 Rio",
      "raceDate": "2026-09-12",
      "distance": "70.3",
      "goal": "competitive",
      "targetTimeSec": 18000
    }
  }
}
```

---

### `GET /api/v1/public/activities`

Lista de atividades executadas (vindas de Strava ou manuais).

**Query params:**
- `from`, `to` — range de datas (default: últimos 90 dias)
- `discipline` — filtro opcional (`run`, `bike`, `swim`, ...)
- `limit`, `offset` — paginação

**Response:**
```json
{
  "data": {
    "range": { "from": "2026-01-17", "to": "2026-04-17" },
    "pagination": { "limit": 50, "offset": 0, "count": 23 },
    "items": [
      {
        "id": "uuid",
        "source": "strava",
        "externalId": "12345678",
        "discipline": "run",
        "title": "Corrida matinal",
        "startedAt": "2026-04-17T09:00:00.000Z",
        "durationSec": 2700,
        "distanceM": 7500,
        "avgHr": 142,
        "maxHr": 168,
        "avgPowerW": null,
        "elevationM": 82.5,
        "calories": 520,
        "perceivedEffort": 6,
        "plannedWorkoutId": "uuid | null"
      }
    ]
  }
}
```

---

### `GET /api/v1/public/activities/:id`

Detalhe completo de uma atividade (inclui `rawData` e `adverseEvents`).

**Response:**
```json
{ "data": { ...todos os campos de activity... } }
```

---

### `GET /api/v1/public/planned-workouts`

Treinos planejados (de planos Endura + importados do intervals.icu).

**Query params:**
- `from`, `to` — range (default: próximos 30 dias)
- `discipline` — filtro opcional
- `limit`, `offset`

**Response:**
```json
{
  "data": {
    "range": { "from": "2026-04-17", "to": "2026-05-17" },
    "pagination": { "limit": 50, "offset": 0, "count": 8 },
    "items": [
      {
        "id": "uuid",
        "scheduledDate": "2026-04-18",
        "discipline": "run",
        "title": "Será que vai?",
        "description": "9x\n- CAMINHADA 3m...",
        "durationMin": 63,
        "distanceM": 10911,
        "intensityZone": null,
        "tssEstimate": 42.0,
        "sentToWatch": true,
        "intervalsWorkoutId": "104935415",
        "planId": "uuid | null",
        "week": null,
        "phase": null
      }
    ]
  }
}
```

**Distinção origem:**
- `planId != null` → gerado pelo plano Endura (IA)
- `intervalsWorkoutId != null && planId == null` → importado do intervals.icu

---

### `GET /api/v1/public/planned-workouts/:id`

Detalhe completo do treino planejado, incluindo `structure` (JSONB com steps) e `nutritionProtocol`.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "scheduledDate": "2026-04-18",
    "discipline": "run",
    "title": "Série de pace",
    "structure": { "steps": [ ... ] },
    "nutritionProtocol": {
      "id": "uuid",
      "items": [ ... ],
      "totalCarbsG": "60.0",
      "totalSodiumMg": "400.0",
      "totalCaffeineMg": "0.0",
      "totalKcal": 240
    }
  }
}
```

---

### `GET /api/v1/public/wellness`

Métricas diárias de recuperação (HRV, sono, peso, SpO2, stress, etc).

**Query params:** `from`, `to` (default: 30 dias)

**Response:**
```json
{
  "data": {
    "range": { "from": "2026-03-18", "to": "2026-04-17" },
    "items": [
      {
        "date": "2026-04-17",
        "hrvMs": 58.2,
        "restingHr": 48,
        "sleepDurationH": 7.3,
        "sleepScore": 82,
        "spo2": 97,
        "stressLevel": 22,
        "bodyBattery": 78,
        "weightKg": 72.4,
        "source": "intervals_icu"
      }
    ]
  }
}
```

---

### `GET /api/v1/public/performance/pmc`

Performance Management Chart: **CTL** (Fitness, EMA 42d do TSS), **ATL** (Fatigue, EMA 7d), **TSB** (Form = CTL - ATL).

**Query params:** `from`, `to` (default: 90 dias)

**Response:**
```json
{
  "data": {
    "range": { "from": "2026-01-17", "to": "2026-04-17" },
    "items": [
      { "date": "2026-04-17", "tss": 42.0, "ctl": 48.3, "atl": 52.1, "tsb": -3.8 }
    ]
  }
}
```

**Interpretação:**
- `tsb > 10`: descansado/fresco (risco de destreinamento se persistir)
- `tsb` entre `-10` e `10`: equilíbrio ótimo
- `tsb < -30`: risco de overtraining
- `ctl` crescendo: ganho de condicionamento

---

### `GET /api/v1/public/performance/readiness`

Avaliação de prontidão mais recente (score AI + fatores).

**Response:**
```json
{
  "data": {
    "date": "2026-04-17",
    "readinessScore": 76,
    "readinessLevel": "moderate",
    "fatigueScore": 58.2,
    "mentorRecommendation": "Bom para treino moderado (Z2/Z3). HRV acima da baseline.",
    "ctl": 48.3, "atl": 52.1, "tsb": -3.8,
    "hrvMs": 58.2, "restingHr": 48, "sleepScore": 82
  }
}
```

`readinessLevel`: `intense` | `moderate` | `light` | `rest`

---

### `GET /api/v1/public/race-goals`

Provas cadastradas (ativas e arquivadas), ordem cronológica ascendente.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "distance": "70.3",
      "raceDate": "2026-09-12",
      "goal": "competitive",
      "targetTime": 18000,
      "raceName": "IM 70.3 Rio",
      "bikeElevationGainM": "850.00",
      "runElevationGainM": "120.00",
      "active": true
    }
  ]
}
```

`distance`: `sprint` | `olympic` | `70.3` | `140.6` | `5k` | `10k` | `21k` | `42k` | ...
`goal`: `finish` | `competitive` | `qualifying`

---

### `GET /api/v1/public/fitness-tests`

Testes de fitness realizados (FTP bike, T30 swim, Cooper run, etc), mais recentes primeiro.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "testType": "bike_ftp20",
      "testDate": "2026-04-10",
      "durationSec": 1200,
      "distanceM": "14200.00",
      "avgPowerW": 246,
      "avgHr": 168,
      "derivedPace": null,
      "derivedFtp": 234,
      "derivedVo2max": null,
      "notes": "Vento lateral"
    }
  ]
}
```

`testType`: `bike_ftp20` | `swim_t30` | `run_cooper12` | `run_5k` | ...

---

## Modelo de dados resumido (para LLMs)

```
user
 └─ athleteProfile (1:1)
 ├─ activities (N)      ← executadas, source=strava|manual|garmin
 ├─ plannedWorkouts (N) ← origem: plan AI ou intervals.icu
 ├─ raceGoals (N)
 ├─ fitnessTests (N)
 └─ dailyMetrics (N)    ← wellness + PMC (CTL/ATL/TSB) por data
```

**Vínculo treino planejado ↔ atividade:** `activities.plannedWorkoutId → plannedWorkouts.id`. Quando a atividade foi "o cumprimento" de um treino planejado, o vínculo existe. Caso contrário `plannedWorkoutId = null`.

---

## Exemplos de uso

### curl — snapshot rápido

```bash
curl -H "X-API-Key: endura_sk_XXX" \
  https://api.endura.app/api/v1/public/summary | jq
```

### curl — atividades da última semana

```bash
curl -H "X-API-Key: endura_sk_XXX" \
  "https://api.endura.app/api/v1/public/activities?from=2026-04-10&to=2026-04-17" | jq
```

### Python

```python
import httpx

API_KEY = "endura_sk_XXX"
BASE = "https://api.endura.app/api/v1/public"
h = {"X-API-Key": API_KEY}

with httpx.Client(headers=h, base_url=BASE, timeout=10) as c:
    summary = c.get("/summary").json()["data"]
    pmc = c.get("/performance/pmc", params={"from": "2026-03-01"}).json()["data"]
    print(f"TSB atual: {summary['latestWellness']['tsb']}")
```

### Prompt inicial para LLM

```
Você é um assistente de treino. Para responder, consulte a Endura Public API.

Autenticação: header `X-API-Key: endura_sk_XXX`
Base URL: https://api.endura.app

Endpoints principais:
- GET /api/v1/public/summary — estado atual (use primeiro)
- GET /api/v1/public/activities?from=&to= — histórico executado
- GET /api/v1/public/planned-workouts?from=&to= — próximos treinos
- GET /api/v1/public/performance/pmc?from=&to= — CTL/ATL/TSB
- GET /api/v1/public/wellness?from=&to= — HRV, sono, peso

Regras:
- Toda distância em metros, duração em segundos (activities) ou minutos (planejados)
- Datas em YYYY-MM-DD
- Disciplinas: run, bike, swim, other
- Antes de recomendar intensidade, consulte /performance/readiness
```

---

## Segurança

- A key é **armazenada hasheada (SHA-256)** no banco. O texto puro existe apenas na resposta de criação.
- Hash comparado em tempo constante via lookup indexado.
- Revogação é imediata (`revoked_at`) — keys revogadas não autenticam mesmo que válidas em cache de cliente.
- `last_used_at` é atualizado em fire-and-forget (não bloqueia latência).
- Uma key compromete apenas dados do próprio usuário. Não há acesso cross-tenant.

## Changelog

- **2026-04-17** — v1 inicial: /me, /summary, /activities, /planned-workouts, /wellness, /performance/pmc, /performance/readiness, /race-goals, /fitness-tests
