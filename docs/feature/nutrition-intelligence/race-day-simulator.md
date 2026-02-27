# Story 5: Race Day Nutrition Simulator

## User Story
Como atleta, quero simular minha estrategia nutricional para o dia da prova, baseado no meu historico e na prova alvo.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/race-nutrition/simulate` | Gera simulacao (Claude Sonnet) |
| GET | `/api/race-nutrition/plans` | Lista planos |
| GET | `/api/race-nutrition/plans/:id` | Detalhe do plano |
| PUT | `/api/race-nutrition/plans/:id` | Atualiza plano |
| DELETE | `/api/race-nutrition/plans/:id` | Remove plano |
| POST | `/api/race-nutrition/plans/:id/test/:activityId` | Marca testado |

## Pagina
- `/nutricao/race-day`
- Formulario: tempo alvo, condicoes climaticas, distancia
- IA gera plano completo por disciplina (swim -> T1 -> bike -> T2 -> run)
- Timeline multi-disciplina expandida
- Portfolio de planos com status (draft/tested/race_ready)

## Nova tabela
- `race_nutrition_plans` (12 colunas)
