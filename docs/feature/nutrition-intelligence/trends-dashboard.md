# Story 4: Nutrition Trends Dashboard

## User Story
Como atleta, quero ver graficos de tendencia da minha nutricao correlacionados com performance.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/nutrition/trends?days=30&discipline=all` | Dados de tendencia |
| GET | `/api/nutrition/readiness-score` | Score consolidado |

## Pagina
- `/nutricao/tendencias`
- Grafico de linha: carbs/h e sodio/h ao longo do tempo (recharts)
- Grafico de barras: score de adesao por semana
- Nutrition Readiness Score consolidado
- Filtros: periodo (7d/30d/90d), disciplina (all/swim/bike/run)
