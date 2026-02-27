# Nutrition Intelligence para Atletas de Endurance

## Overview

O epic Nutrition Intelligence transforma o Endura de "gerador de planos" para **coach nutricional pessoal com memoria e aprendizado**. O atleta pode planejar sua nutricao diaria de forma inteligente, executar o plano com facilidade, analisar o que deu certo/errado, e construir confianca progressiva na estrategia nutricional para o dia da prova.

## Stories

| # | Story | Complexidade | Status |
|---|-------|-------------|--------|
| 1 | [Smart Nutrition Planner](./smart-planner.md) | L | Implementada |
| 2 | [Nutrition Execution Tracker](./execution-tracker.md) | M | Implementada |
| 3 | [Post-Workout Analysis com IA](./post-workout-analysis.md) | L | Implementada |
| 4 | [Nutrition Trends Dashboard](./trends-dashboard.md) | M | Implementada |
| 5 | [Race Day Nutrition Simulator](./race-day-simulator.md) | L | Implementada |
| 6 | Playwright E2E Test Suite | L | Implementada |

## Arquitetura

### Backend (Fastify + Drizzle + Claude API)

Novos modulos:
- `nutrition-planner` - Planejamento diario com IA (Haiku)
- `nutrition-analysis` - Analise pos-treino com IA (Haiku)
- `race-nutrition` - Simulacao race day com IA (Sonnet)

Modulo existente estendido:
- `nutrition` - Endpoints de trends, readiness-score, follow-protocol, comparison

### Frontend (Next.js 15 + TanStack Query)

Novos componentes:
- `daily-nutrition-card` - Card de nutricao do dia no dashboard
- `customize-protocol-sheet` - Sheet para editar protocolo
- `protocol-comparison` - Comparacao prescrito vs real
- `quick-log-buttons` - Botoes de 1-tap para log
- `ai-analysis-card` - Card de analise IA
- `trends-chart` - Graficos de tendencia (recharts)
- `readiness-score` - Score circular de prontidao
- `race-simulation-form` - Formulario de simulacao
- `race-plan-timeline` - Timeline multi-disciplina
- `race-plan-card` - Card de plano salvo

Novas paginas:
- `/nutricao/tendencias` - Dashboard de tendencias
- `/nutricao/race-day` - Simulador race day

### DB Changes

Tabelas modificadas:
- `nutrition_protocols` +3 colunas (status, acceptedAt, weatherContext)
- `nutrition_logs` +5 colunas (nutritionProtocolId, followedExactly, carbsPerHour, sodiumPerHour, adherenceScore)

Tabela nova:
- `race_nutrition_plans` (12 colunas)

Migration: `0002_confused_spiral.sql`

## Uso de IA

| Funcao | Modelo | Quando |
|--------|--------|--------|
| Gerar protocolo personalizado | Haiku | On-demand (Story 1) |
| Analise pos-treino | Haiku | On-demand (Story 3) |
| Deteccao de padroes | Haiku | On-demand (Story 3) |
| Simulacao race day | Sonnet | On-demand (Story 5) |
