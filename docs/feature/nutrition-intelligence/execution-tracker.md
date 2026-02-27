# Story 2: Nutrition Execution Tracker

## User Story
Como atleta, quero registrar rapidamente o que consumi apos o treino, com opcao "segui exatamente" ou "registrar diferencas", para tracking rapido e sem friccao.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/nutrition/log/:activityId/follow-protocol` | Copia protocolo para log (1 tap) |
| GET | `/api/nutrition/log/:activityId/comparison` | Prescrito vs real + metricas |

## Fluxo
1. Pagina de atividade carrega e busca comparison
2. Se existe protocolo: mostra botoes "Segui Exatamente" e "Registrar Diferencas"
3. "Segui Exatamente" copia todos itens do protocolo para o log
4. Metricas automaticas: g/h carbs, mg/h sodio
5. Indicadores visuais: verde (meta), amarelo (parcial), vermelho (sub-fueling)

## Alteracoes no DB
- `nutrition_logs.nutritionProtocolId` uuid FK nullable
- `nutrition_logs.followedExactly` boolean default false
- `nutrition_logs.carbsPerHour` numeric(6,2)
- `nutrition_logs.sodiumPerHour` numeric(6,2)
