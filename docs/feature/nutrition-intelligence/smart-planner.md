# Story 1: Smart Nutrition Planner

## User Story
Como atleta, quero ver o plano nutricional personalizado para o treino de hoje no dashboard, com timeline de quando comer cada item, para nao pensar em nutricao na hora do treino.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/nutrition-planner/today` | Treino + protocolo do dia |
| POST | `/api/nutrition-planner/generate/:workoutId` | Gera protocolo via IA |
| POST | `/api/nutrition-planner/accept/:protocolId` | Marca como aceito |
| POST | `/api/nutrition-planner/apply-preset/:workoutId` | Aplica preset do usuario |
| PUT | `/api/nutrition-planner/customize/:protocolId` | Edita itens do protocolo |

## Fluxo
1. Dashboard carrega e mostra card "Nutricao do Dia"
2. Se protocolo existe: mostra timeline + totais + botoes (Aceitar/Preset/Personalizar)
3. Se nao existe: botao "Gerar Nutricao" chama Claude Haiku
4. IA considera: historico de eventos adversos, produtos favoritos, perfil atletico
5. Atleta aceita ou personaliza o protocolo

## Alteracoes no DB
- `nutrition_protocols.status` varchar(20) default 'generated'
- `nutrition_protocols.acceptedAt` timestamp nullable
- `nutrition_protocols.weatherContext` jsonb nullable
