---
created: 2026-06-25
updated: 2026-07-23
author: Daniel
status: living
---

# Endura vs TrainingPeaks vs WHOOP — Benchmark & Roadmap

Revisão de produto para posicionar o Endura como ferramenta **topo de linha** de treinamento + nutrição para atletas de endurance, com o **diferencial** de ser operável por IA (Claude via MCP) e ter uma web app excelente para visualização.

> **Tese:** TrainingPeaks é o padrão de mercado em *carga de treino* (PMC) e WHOOP em *recuperação fisiológica* (recovery/strain). O Endura já cobre a base dos dois e tem três coisas que **nenhum** deles tem: (1) **nutrição intra-treino e de prova prescrita**, (2) **memória de coaching persistente**, e (3) **escrita autoritativa de plano por uma IA**. A estratégia é fechar as lacunas de análise e **dobrar a aposta no loop com o Claude**.

---

## 1. Apanhado — TrainingPeaks

Fonte: [Performance Manager](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/), [ATL/CTL/TSB](https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/), [Form (TSB)](https://help.trainingpeaks.com/hc/en-us/articles/204071764-Form-TSB).

| Recurso | O que é | Endura hoje |
|---|---|---|
| **TSS** | Carga por treino (1h no FTP = 100) | ✅ real via NP/FTP (bike/run com streams do Strava); FC como fallback quando não há potência |
| **CTL / ATL / TSB** | EMA 42d / 7d / diferença ("Fitness/Fadiga/Forma") | ✅ calculado ao vivo, agora com TSS real (não só estimativa por FC) |
| **PMC (Performance Manager)** | Gráfico de fitness/fadiga/forma com **projeção futura** dos treinos planejados | ⚠️ tínhamos só o retrospectivo → **✅ projeção entregue (esta release)** |
| **Faixa de pico (TSB +15…+25)** | Forma ideal para prova A (Friel) | ✅ avaliação de pico na projeção |
| **Mean-Max / Peak Power Curve** | Melhor potência por duração (5s…3h) | ✅ curva de potência (5s–90min) por atividade — **entregue** (streams agora persistidas) |
| **Peak Performances** | Recordes (melhor pace 1k/5k/10k, FTP, etc.) | ⚠️ melhor esforço de pace por atividade entregue; falta ranking "recorde histórico" entre atividades |
| **Time-in-Zones** | Distribuição de tempo por zona de FC/potência/pace | ✅ zonas de FC/potência por atividade — **entregue** |
| **NP / IF / VI / EF / Decoupling / VAM / Análise por lap** | Métricas avançadas de potência (Coggan) | ✅ **entregue** — não estava nem no benchmark original, TP/intervals.icu como referência |
| **ATP (Annual Training Plan)** | Periodização anual com metas semanais de CTL/volume | ⚠️ plano por semana, sem visão de temporada |
| **Workout Builder + envio p/ device** | Treino estruturado → relógio | ✅ via intervals.icu (`sentToWatch`) |
| **Calendar (multi-mês)** | Calendário arrastar-soltar | ⚠️ semana atual + calendário de provas |

## 2. Apanhado — WHOOP

Fonte: [Recovery](https://support.whoop.com/s/article/WHOOP-Recovery), [Recovery 101](https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/).

| Recurso | O que é | Endura hoje |
|---|---|---|
| **Recovery Score (0–100)** | HRV + FC repouso + sono + freq. respiratória, **vs baseline pessoal** | ⚠️ readiness existe, mas pondera mais PMC+subjetivo que biometria baselined |
| **Strain (0–21)** | Carga cardiovascular cumulativa do dia (escala Borg) | ⚠️ usamos TSS/monotonia/strain de Foster (não-cardio direto) |
| **Strain Target / "Strain Coach"** | Quanto treinar hoje dado o recovery | ⚠️ readiness dá *nível* (intenso/leve), não *alvo de carga* |
| **Sleep Performance (%)** | Sono obtido vs necessidade, consistência, eficiência | ⚠️ temos duração + score + estágios (deep/light/rem), sem "% da necessidade" |
| **HRV / RHR / Resp. trends** | Tendências baselined com bandas | ✅ HRV (status + baseline), RHR, resp.; faltam bandas visuais |
| **Stress Monitor** | Stress contínuo ao longo do dia | ⚠️ stress diário (Garmin) capturado, sem série intradiária |
| **Baseline pessoal adaptativo** | Tudo comparado ao próprio histórico | ⚠️ só HRV tem baseline; estender p/ RHR/sono/resp. |

## 3. Onde o Endura já lidera (diferenciais a defender)

- **Nutrição prescrita** intra-treino (carbo/sódio/cafeína por fase) + **simulador de nutrição de prova** — TrainingPeaks/WHOOP não modelam.
- **Memória de coaching persistente** (`coach_profile` + `coach_assessments` + `coach_directives`) — a IA retoma o contexto a cada sessão.
- **Operável por IA (MCP)**: 33 tools, leitura e **escrita autoritativa** de plano/treinos/nutrição. Closed-loop analisar → projetar → adaptar.
- **Body Battery / readiness integrados** ao mesmo modelo de carga.

---

## 4. Matriz de lacunas → backlog priorizado

Legenda de esforço: S (≤1 dia), M (2–4 dias), L (semana+, depende de streams/integração nova).

### P0 — Maior valor, buildável já
1. ✅ **Projeção de forma (PMC forward-looking)** — *entregue nesta release.* CTL/ATL/TSB até a prova + avaliação de pico + taper sugerido, exposto na web e via MCP (`endura_get_pmc_forecast`).
2. ✅ **Recovery Score estilo WHOOP** — *entregue nesta release.* Score 0–100 de HRV/FC repouso/sono/FR **vs baseline pessoal** (z-score por métrica, pesos HRV 50% / RHR 25% / sono 15% / FR 10%, renormalizados), banda verde/amarelo/vermelho, separado do readiness (que mistura PMC+subjetivo). `computeRecoveryScore()` + `RecoveryCard` na web + MCP (`endura_get_recovery`).
3. ✅ **Strain Target diário** — *entregue nesta release.* A readiness agora sugere uma **faixa de TSS-alvo para hoje** (`loadTarget`, ancorada no CTL e escalada pela prontidão), exposta no `readiness-card` e via MCP (`endura_get_readiness`). Fecha o loop com a projeção (quanto treinar p/ chegar no pico).
4. **Season/ATP view na web (M)** — calendário multi-semana com CTL planejado vs realizado e marcos das provas A/B/C. Reusa `projectPMC`.

### P1 — Forte, médio esforço
5. ✅ **Time-in-Zones + curva de pace/potência + análise avançada (NP/IF/TSS/VI/EF/decoupling/VAM/laps)** — *entregue nesta release.* Streams+laps do Strava (bike/run) persistidas em `activity_streams`; motor de análise (`activity-analytics.ts`) estilo TrainingPeaks/intervals.icu; UI com abas Resumo/Gráfico/Picos/Zonas na atividade. TSS real substitui a estimativa por FC no PMC. Backfill de ~200 atividades históricas + recompute já rodados em prod. **Gaps que ficaram**: swim não coberto (sem power/pace útil via Strava), intervals.icu só usa os campos já computados por eles (`icu_average_watts`/`icu_training_load`) — sem streams completas dessa fonte —, e não há ranking de recorde histórico entre atividades (só picos por atividade individual).
6. **Sleep Performance % (S)** — necessidade de sono por perfil + comparação; já temos estágios.
7. **Stress intradiário (M)** — série de stress do Garmin via intervals (se exposto).
8. **Tendências baselined visuais (S)** — bandas (verde/amarelo/vermelho) em HRV/RHR/sono no card de wellness, estilo WHOOP.

### P2 — Diferenciação / "wow"
9. **Coach proativo (M)** — cron semanal que roda o loop do coach (projeção + readiness) e grava um `coach_assessment` + notifica, sem o usuário pedir.
10. **What-if de plano via Claude (M)** — "e se eu adicionar 2h de Z2/semana?" → recalcula a projeção de pico antes de gravar.
11. **Detecção de overreaching (S)** — alerta quando monotonia/strain (Foster) cruzam limiar com HRV em queda.

---

## 5. Próximo passo recomendado

Sequência sugerida: **#2 Recovery Score (WHOOP) → #3 Strain Target → #4 ATP view**. Os três reaproveitam dados já capturados (HRV/sono/RHR/resp. + planned workouts) e completam o tripé "passado (PMC) / presente (recovery) / futuro (projeção)", deixando o Endura com paridade analítica sobre TrainingPeaks **e** WHOOP — e à frente nos diferenciais (nutrição + IA).

---

## Histórico

| Data | Alteração |
|---|---|
| 2026-06-25 | Criação do benchmark + entrega do item P0.1 (projeção de forma) |
| 2026-07-23 | Entrega do item P1.5 (análise avançada de atividade: NP/IF/TSS/VI/EF/decoupling/VAM/picos/zonas/laps) — ver `apps/api/src/modules/activity/activity-analytics.ts`. TSS real substitui estimativa por FC no PMC. |
