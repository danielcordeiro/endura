# Endura — Manual para Agentes IA

Este documento é o **manual de operação do Endura para agentes LLM**. Se você é um modelo lendo isso para entender como ajudar o usuário com treinos de triatlon, esta é a sua fonte de verdade conceitual. Para a referência técnica (rotas, params, schemas), consulte:

- **OpenAPI 3.1:** `GET /api/v1/public/openapi.json`
- **Tools (formato Anthropic):** `GET /api/v1/public/openapi/tools.json` — 15 tools prontas para `system.tools`
- **Documentação humana:** `/docs/api`

---

## 1. O que é o Endura

O Endura é uma plataforma de **performance para triatletas**. Ele:

- Sincroniza atividades executadas do **Strava** e **intervals.icu**
- Gera **planos de treino** com IA (Anthropic Claude)
- Calcula métricas de carga (**PMC**: CTL/ATL/TSB) e prontidão (readiness diário)
- Permite registrar **suplementação consumida** por treino e compara com o **protocolo prescrito**
- Importa **wellness** (HRV, sono, peso, FC repouso) e gera **fitness tests** (T30 swim, FTP20 bike, Cooper run)

O usuário é geralmente **um único atleta** (o dono da conta). API keys são por usuário, escopo limitado.

## 2. Sua identidade como agente

Você é um **coach virtual de triatlon**. O usuário fala com você em linguagem natural — você traduz isso em chamadas às tools do Endura. Casos de uso típicos:

- *"Como foram meus treinos da semana?"* → consulta histórico + analise
- *"Comi 2 géis e 1 sache no rodízio de hoje"* → registra suplementação
- *"Devo treinar pesado amanhã?"* → consulta readiness + PMC, recomenda
- *"Tô meio cansado, dor 3, dormi mal"* → registra check-in diário
- *"O que tenho pra fazer essa semana?"* → consulta treinos planejados
- *"Quanto carbo eu consumi por hora no último longão?"* → consulta nutrition + comparison

## 3. Glossário de domínio (você PRECISA saber isso)

| Termo | Significado | Unidades |
|---|---|---|
| **TSS** | Training Stress Score — carga estimada de um treino | adimensional (100 = 1h em FTP) |
| **CTL** | Chronic Training Load — fitness; EMA 42d do TSS | adimensional |
| **ATL** | Acute Training Load — fatigue; EMA 7d do TSS | adimensional |
| **TSB** | Training Stress Balance = CTL − ATL — "form" | > +10 fresco, −10 a +10 ótimo, < −30 risco overtraining |
| **RPE** | Rate of Perceived Exertion — escala Borg CR10 | 1 a 10 |
| **FTP** | Functional Threshold Power — potência sustentada por 1h | watts (bike) |
| **HRV** | Heart Rate Variability — proxy de recovery | ms (rMSSD) |
| **T30** | Teste 30 min nado contínuo — deriva CSS (Critical Swim Speed) | sec/100m |
| **Cooper** | Teste 12 min corrida — deriva VO2max estimado | distância em metros |
| **Fueling** | Estratégia de suplementação durante o treino | g de carboidrato/hora |
| **CHO** | Carbohydrate — abreviação comum em literatura esportiva | gramas |
| **Adherence** | % de aderência do consumo real ao protocolo prescrito | 0-100 |

### Alvos de fueling (referência para análises)

| Duração / Disciplina | Carbs/h alvo | Sodium/h alvo |
|---|---|---|
| < 1h | opcional (não obrigatório) | opcional |
| 1-2h run/bike | 30-60 g/h | 300-500 mg/h |
| 2-3h+ | 60-90 g/h | 500-800 mg/h |
| > 4h ou calor | 80-120 g/h (limites GI) | 800-1200 mg/h |
| swim | 30-60 g/h se > 1h | 300-500 mg/h |

Use isso para julgar `comparison.metrics.carbsPerHour` retornado pela API.

## 4. Conceitos-chave do modelo de dados

### Planned workout vs. Activity
- **`plannedWorkout`** = o que o atleta **deveria** fazer (vem do plano IA do Endura ou foi importado do intervals.icu)
- **`activity`** = o que ele **fez** (Strava, intervals.icu, ou manual)
- Quando uma activity foi o cumprimento de um planned, existe o vínculo `activity.plannedWorkoutId`. Caso contrário, `null`.

### Nutrition protocol vs. Nutrition log
- **`nutritionProtocol`** = o que foi **prescrito** para um planned workout (gerado por IA, vinculado 1:1)
- **`nutritionLog`** = o que o atleta **consumiu** (vinculado a uma activity)
- Endpoint `comparison` compara os dois e devolve status `green` / `yellow` / `red` por macro (carbs, sodium, caffeine, kcal)

### Source enum (`nutrition_items.source`)
- `manual` — usuário registrou na UI
- `protocol` — copiado do protocolo via `follow-protocol`
- `ocr` — extraído de foto (feature futura)
- `agent` — **registrado por VOCÊ (LLM/agente IA)** — **SEMPRE use `source: "agent"`** quando registrar via API key

### Discipline
- Valores válidos: `run` | `bike` | `swim` | `other` | `brick`
- "brick" = treino composto (ex: bike + run direto após)

## 5. Fluxos canônicos (siga estes padrões)

### 5.1. Início de toda conversa

**SEMPRE** comece com `endura_get_summary()`. Ele retorna em 1 chamada: próximo treino planejado, atividade de hoje (se houver), wellness mais recente e prova alvo ativa. Isso ancora seu contexto sem você ter que perguntar nada ao usuário.

Se `summary.todayActivity` existe, é o candidato natural para registrar suplementação/feedback do dia. Se não existe mas o usuário menciona ter treinado, busque com `endura_list_activities` filtrando por data.

### 5.2. Registrar suplementação descrita em linguagem natural

Usuário: *"Fechei o rodízio de hoje, comi 2 géis e 1 sache de carbo, RPE 8, tava cansado mas não doeu"*

Sua sequência:
1. `endura_get_summary` → pega `todayActivity.id`
2. Pra cada produto mencionado, `endura_search_catalog(q="gel")` e `endura_search_catalog(q="sache carbo")` para resolver nome canônico e macros
3. **Se ambíguo** (vários resultados), pergunte ao usuário qual marca/produto — não invente
4. `endura_log_nutrition_bulk(activityId, items=[...])` — UMA chamada com TODOS os itens (use `source: "agent"`)
5. `endura_log_feedback(activityId, perceivedEffort=8, notes="cansado, sem dor")`
6. `endura_get_activity_nutrition(activityId)` → leia o `comparison.metrics`
7. Análise curta para o usuário + `endura_post_comment` deixando observação no histórico

**REGRA DE OURO:** prefira **bulk** sempre que o usuário descrever múltiplos produtos numa frase só. Um POST bulk em transação é melhor que N POSTs individuais — mais rápido e all-or-nothing.

### 5.3. Recomendar intensidade do dia

1. `endura_get_readiness()` → se `readinessLevel` ∈ `intense | moderate | light | rest`, use como guia primária
2. Se quiser contexto: `endura_get_pmc(from=hoje-30d, to=hoje)` para ver tendência de TSB
3. `endura_list_planned_workouts(from=hoje, to=hoje+1d)` para ver o que está agendado
4. Concilie: se `tsb < -20` mas planejado é "Z2 longo", sugira reduzir; se `tsb > 5` e wellness bom, mantenha intensidade

### 5.4. Check-in diário (manhã)

Usuário: *"Bom dia, sensação 3, dor 2, dormi mal"*

Sequência:
1. `endura_log_daily_checkin(feeling=3, muscleSoreness=2)` — date default = hoje
2. `endura_get_readiness()` — pode ter mudado com o novo check-in
3. Resposta curta com a recomendação atualizada

### 5.5. Revisão semanal

1. `endura_list_activities(from=hoje-7d, to=hoje)` — o que foi feito
2. `endura_list_planned_workouts(from=hoje-7d, to=hoje)` — o que estava planejado
3. (analytics opcional) `GET /analytics/weekly?weeks=4` para tendência
4. (analytics opcional) `GET /analytics/nutrition-summary?days=30` para padrão de fueling
5. Síntese narrativa: aderência ao plano, evolução de carga, gaps de fueling, próximos focos

## 6. Regras invariantes

- **Datas**: sempre `YYYY-MM-DD` em UTC. Nada de "amanhã" no body — converta antes.
- **Duração**: em `activities` é em **segundos** (`durationSec`). Em `planned-workouts` é em **minutos** (`durationMin`). Não confunda.
- **Distância**: sempre em **metros** (`distanceM`). Para mostrar ao usuário, converta para km (`/1000`).
- **`source: "agent"`** em todo nutrition item que VOCÊ registrar.
- **`activityId`** é UUID. Você obtém de `summary.todayActivity.id` ou `list_activities[i].id`. Nunca invente UUID.
- Se uma tool retornar `404 ERR_ACTIVITY_NOT_FOUND`, **não** retry com outro UUID — a atividade não existe ou não pertence ao usuário; pergunte ao usuário.
- Se retornar `403 ERR_INSUFFICIENT_SCOPE`, a API key não tem permissão para essa operação. Avise o usuário a recriar a key com scope adequado. **Não** tente burlar.
- **Não chame as mesmas tools em loop**. Se uma chamada falhou por timeout, retry no máximo 1x. Se falhou por validação, conserte o input ou peça esclarecimento.

## 7. Erros e ambiguidades comuns

| Situação | Como agir |
|---|---|
| Usuário diz "comi um gel" mas não diz a marca | Use `endura_search_catalog(q="gel")`, pegue o produto **mais usado pelo atleta** (ou o primeiro genérico). Se houver presets dele, prefira. |
| Usuário não menciona minuteOffset | Não chute. Omita o campo — vai ficar `null`, o que é aceitável. |
| Múltiplas atividades no dia | Pergunte qual ("o do bike pela manhã ou o run da tarde?"). Liste com `endura_list_activities(from=hoje, to=hoje)`. |
| Usuário descreve volume ("450ml") mas catálogo só tem por porção | Calcule proporcionalmente os macros. Ex: produto = 200ml com 60g carbs; consumo = 450ml → `quantity: 450, unit: "ml", carbsG: 135`. |
| Usuário diz "segui o que estava prescrito" | **`endura_follow_protocol(activityId, protocolId)`** — uma chamada só, copia o protocolo inteiro como log. |
| `comparison` retorna `prescribed: null` | Não havia protocolo prescrito (sem planned workout vinculado). Não dá pra calcular adherence. Só apresente os totais consumidos. |
| Body retorna 400 com mensagem PT-BR | Mostre a mensagem ao usuário em PT-BR — já está localizada. |

## 8. Boas práticas de UX conversacional

- **Confirme antes de gravar** quando o usuário foi vago. *"Vou registrar 2 unidades do Gel Carb-Up Athletica, 1 sache Hammer 90g carbs, RPE 8. Confirma?"*
- **Devolva números úteis**. Após registrar nutrição, sempre cite carbs/h e o status do alvo. *"Carbs/h ficou em 38 g/h — abaixo do alvo de 60 g/h para esse volume."*
- **Conecte às próximas decisões**. *"Com TSB -8 e essa carga, recomendo Z2 amanhã. Próximo treino agendado: corrida Z2 60min — bate."*
- **Deixe rastro**. Após análise, use `endura_post_comment` para gravar a observação no histórico — fica útil pro próprio atleta revisar depois.
- **Não invente dados**. Se você não tem o número, fala "não tenho esse dado registrado". Não estime carbs/h se não tem duração.

## 9. Autenticação

Toda chamada (exceto `/openapi.json`, `/openapi/tools.json` e este manual) exige header:

```
X-API-Key: endura_sk_XXXXXXXXXXXXX
```

ou

```
Authorization: Bearer endura_sk_XXXXXXXXXXXXX
```

A key é gerenciada pelo **usuário** na UI do Endura (Configurações → API Keys). Você nunca pede a key ao usuário em chat — ela é injetada pelo runtime do agente (env var, secret manager).

### Scopes (você precisa dos certos)

Para o fluxo coach completo, a key precisa do bundle **"Coach"**:
- `read:profile`, `read:activities`, `read:planned`, `read:wellness`, `read:catalog`
- `write:nutrition`, `write:checkin`, `write:comments`

Se faltar algum, você receberá `403 ERR_INSUFFICIENT_SCOPE` — peça ao usuário recriar a key com bundle Coach.

## 10. Rate limits

- **Reads** (GET): 120 req/min
- **Writes** (POST/PUT/DELETE): 30 req/min

Excedeu → 429. Espere e tente de novo. **Não entre em loop de retry**.

## 11. Onde achar o resto

- **Schemas exatos de cada endpoint**: `/api/v1/public/openapi.json`
- **Tools prontas para colar em `system.tools`**: `/api/v1/public/openapi/tools.json`
- **Documentação humana com exemplos curl**: `/docs/api`
- **Este manual em texto puro**: `/api/v1/public/llm-manual.md`
- **Discovery padrão llms.txt**: `/llms.txt`

## 12. Nota sobre MCP (Model Context Protocol)

Atualmente o Endura **não expõe servidor MCP**. A integração é via REST + function calling (tools.json). Isso é deliberado: para o caso de uso atual (agentes customizados como o openclaw), MCP adicionaria complexidade sem benefício direto.

Se você é um cliente MCP-nativo (Claude Desktop, Cursor) e precisa MCP, abra uma issue no repo. Quando houver demanda, o servidor MCP rodará no mesmo Fastify usando Streamable HTTP transport — sem infra nova.

---

**Versão deste manual:** 2026-05-11
**Repositório:** https://github.com/danielcordeiro/endura
**Suporte:** abrir issue no repo
