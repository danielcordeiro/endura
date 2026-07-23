# Design — Análise Aerodinâmica no Endura (Fase 1: CdA passivo)

**Data:** 2026-07-23
**Status:** Aprovado (Daniel), em implementação
**Origem:** vídeo "AiRO | The New Standard in Cycling Aero Analysis". O AiRO literal
(CFD + modelo 3D por IA a partir de scan, gated por fitter certificado) não é
replicável num app de treino. O *valor* — "saber seu arrasto sem túnel de vento" —
tem um caminho implementável: estimar **CdA a partir dos dados da própria pedalada**
(método Best Bike Split / Chung virtual-elevation), que encaixa no pipeline de
análise que o Endura já tem.

## Escopo em duas fases

- **Fase 1 (este doc):** CdA estimado *passivamente* em toda pedalada com potência.
  Regressão global com Crr fixo. Selo de confiança. Roda no ingest e no recompute.
- **Fase 2 (futuro):** modo "Teste Aero" guiado (ida-e-volta / laps em trecho plano)
  → Chung/virtual-elevation resolve CdA (e Crr) fechando os laps, compara posições.

## Decisões travadas (brainstorming 2026-07-23)

| Tema | Decisão |
|---|---|
| Vento | Fase 1 assume **ar parado** + penalidade de confiança quando não verificável. Weather API fica pra depois. |
| Massa/Crr | **Campo de setup no perfil** (peso da bike + preset de pneu/piso → Crr). Migration idempotente. |
| Exibição | **Sempre** que houver potência, com badge baixa/média/alta + motivo limitante. |
| Motor | **Abordagem A**: regressão global ponderada, Crr fixo. |

## 1. Arquitetura

Módulo **puro** novo: `apps/api/src/modules/activity/aero.ts` (mesmo estilo de
`activity-analytics.ts` — funções puras, testáveis, sem I/O).

```ts
estimateAero(resampled: ResampledStreams, ctx: AthleteContext, setup: AeroSetup): AeroResult | null
```

Plugado em `analyzeActivity` só quando `discipline === 'bike'` e há sinal de potência.
Resultado entra como campo **opcional** em `AnalysisResult` (`aero?: AeroResult | null`)
— aditivo, não quebra consumidor. Pedaladas antigas ficam sem `aero` até o recompute.
Bump `version` 1→2 opcional (decidir na implementação).

## 2. Física — abordagem A (regressão global, Crr fixo)

Constantes: `g = 9.80665`, `η_drivetrain = 0.975` (PM no pedivela/pedal; configurável).
Inércia rotacional desprezada na Fase 1.

Por amostra 1Hz aero-válida:
```
P_roda = P_medida · η
ρ      = densidade do ar (altitude ISA + temp da stream tempC; senão 15 °C)
θ      = atan(grade)         # stream gradePct; senão d(alt)/d(dist) suavizado
a      = dv/dt               # diferença finita suavizada
m      = peso_atleta(perfil) + peso_bike(setup)

Y = P_roda − v·( Crr·m·g·cosθ + m·g·sinθ + m·a )
X = ρ·v³
CdA = Σ(Y·X) / Σ(X²)         # mínimos quadrados pela origem
```
Um passe robusto (IRLS/Huber ou trim por MAD) mata rajada/buraco/spike de GPS.
Clampa em `0.15–0.60 m²`; fora → inválido.

**Máscara aero-válida** (descarta): parado; `v < 5 m/s`; `|a| > 0.5 m/s²`;
freada (desaceleração > que arrasto+rolamento explicam com `P≈0`); `|grade| > 8%`.
Exige `≥ 120 s` úteis, senão confiança baixa / sem número.

Densidade do ar (ISA):
```
p = p0 · (1 − 0.0065·h / 288.15) ^ 5.255      # h = altitude (m), p0 = 101325 Pa
ρ = p / (287.05 · (T + 273.15))               # T = tempC (ou 15 °C default)
```

## 3. Confiança (selo)

Score `0–1` → **baixa / média / alta**, a partir de:
fração útil da pedalada, segundos úteis absolutos, cobertura em alta velocidade
(força do sinal aero), RMS do resíduo, penalidade de vento não verificado.
Guarda `score`, `tier`, `reasons[]`. Tela mostra o fator limitante.
Vento sem verificação só chega a "alta" em pedalada longa/plana/estável.

## 4. Schema / migration (idempotente)

`athlete_profiles` (SQL com `ADD COLUMN IF NOT EXISTS` — cuidado com drift de
snapshot do Drizzle, ver CLAUDE.md):
- `bike_weight_kg numeric(4,2)`
- `crr numeric(5,4)` — resolvido de preset no UI
- `drivetrain_efficiency numeric(4,3)` default `0.975` (avançado, opcional)

`activities.analysis.aero` → jsonb, **zero migration**.
Denormalizar `cda` em coluna própria (como `tss`) fica pra Fase 1.5 (view de tendência).

Presets de Crr (dropdown): road GP5000/latex ≈ 0.0033, road 25mm ≈ 0.004,
road treino ≈ 0.005, gravel ≈ 0.008, MTB ≈ 0.012.

## 5. API / ingestão / recompute

- `AthleteContext` ganha `bikeWeightKg`/`crr`/`drivetrainEff`; `analyzeActivity` repassa.
- Ingestão nova: `strava-sync.service.ts` já chama analyze → CdA automático.
- Backfill: `recompute-activity-analysis.ts` recomputa das streams salvas **sem gastar
  rate limit** — estende `profileCache` com bike/crr. Roda uma vez, popula histórico.

## 6. UI (Fase 1)

- `analysis-types.ts`: espelha `AeroResult` + `aero?` opcional.
- `analysis-summary.tsx`: card compacto dentro do bloco de potência (só quando `aero`):
  - **CdA 0.281 m²** + bolinha de confiança (vermelho/âmbar/verde) + motivo.
  - Tradução tangível: **"≈ 11 W a 40 km/h"**.
  - Delta vs mediana 30d → Fase 1.5 (precisa da coluna denormalizada).

## 7. Testes

`apps/api/scripts/verify-aero.ts` (padrão `tsx`, zero dep nova): pedalada sintética
com CdA/Crr/massa conhecidos → afirma recuperação dentro de tolerância; testa
exclusão de freada, densidade do ar e tiers de confiança. `vitest` no `apps/api`
fica como upgrade opcional.

## 8. Deploy

- Bump `apps/web/lib/version.ts` (regra do Daniel).
- 1 push por deploy (pushes em sequência cancelam build do Render).
- Migration aplicada em prod (Supabase é o único banco) via SQL idempotente.
- Recompute rodado em prod pra popular o histórico.
- Verificar versão no ar antes de considerar entregue.
