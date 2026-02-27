# Story 3: Post-Workout Nutrition Analysis

## User Story
Como atleta, quero uma analise IA comparando nutricao prescrita vs executada, com insights acionaveis e deteccao de padroes.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/nutrition-analysis/:activityId` | Gera analise via IA |
| GET | `/api/nutrition-analysis/:activityId` | Retorna analise existente |
| GET | `/api/nutrition-analysis/patterns?days=30` | Padroes 30/60/90 dias |

## Fluxo
1. Apos registrar nutricao, botao "Analisar com IA" aparece
2. IA gera: sub-fueling, over-fueling, timing errado, tolerancia GI
3. Deteccao de padroes em atividades anteriores
4. Score de Adesao Nutricional 0-100 calculado e persistido
5. Insights salvos na tabela `ai_insights`

## Alteracoes no DB
- `nutrition_logs.adherenceScore` numeric(5,2) nullable
