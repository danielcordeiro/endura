# Plano de Evolução UI/Design — Endura Web

**Data:** 2026-07-05 · **Escopo:** somente `apps/web` (zero mudança em API/banco) · **Status:** pronto para execução

Este documento é um handoff para um agente/dev executor. Ele consolida uma auditoria completa
do front (4 varreduras: formulários, dashboard/cards, páginas de conteúdo e stack visual) com
evidências `arquivo:linha`, e organiza a execução em fases independentes, cada uma com critério
de aceite. **Leia a seção 1 (regras de execução) antes de tocar em qualquer código.**

Objetivo pedido pelo Daniel:
1. Cores mais modernas e "premium".
2. Corrigir campos "colados" (inputs sem respiro) e erros/inconsistências de CSS.

---

## 1. Regras de execução (obrigatórias)

- **pnpm:** SEMPRE `npx pnpm@9 ...`. O pnpm 10 global da máquina quebra o repo (engine mismatch
  e `--frozen-lockfile` do Render).
- **Deploy:** todo push que dispara deploy exige bump em `apps/web/lib/version.ts` (hoje `1.1.2`).
  **1 push por deploy** — pushes em sequência cancelam o build do Render. Confirmar que subiu
  comparando a versão exposta no app com a do arquivo.
- **Cada fase = 1 commit + 1 push + 1 bump de versão.** Não acumular fases num push só, nem
  dividir uma fase em vários pushes seguidos.
- **Servidor local não sobe** (conflito undici × Node 20.19). Validação: `npx pnpm@9 build` no
  workspace web + screenshots via Playwright (config de e2e existe; exige `TEST_EMAIL`/`TEST_PASSWORD`
  no ambiente — nunca hardcodar).
- **PWA:** o service worker cacheia o shell. Ao validar no browser, hard refresh antes de
  concluir que algo "não mudou".
- **Repo é PÚBLICO:** nenhum dado pessoal em commits/docs.
- **Git:** stage seletivo (nunca `git add -A`), mensagem via `git commit -F <arquivo-temp>`.
- **Tailwind v4 CSS-first:** não existe `tailwind.config.*`; tokens vivem em
  `apps/web/app/globals.css` no bloco `@theme`. Todo token novo entra ali.
- **Migração de cor "same-hex" deve ser no-op visual:** os tokens semânticos têm o MESMO hex
  das cores cruas equivalentes (ex.: `text-slate-100` ≡ `text-text-primary`). Verificar por
  screenshot antes/depois em cada lote. Se um pixel mudou fora do esperado, parar e investigar.
- **Fatos já verificados (não "re-descobrir"):**
  - `cn()` em `lib/utils.ts` usa `twMerge` — `className` passado a `<Button>` sobrescreve a base
    de forma determinística. Overrides tipo `h-14` NÃO são bug de CSS, são dívida de API do
    componente (resolver com prop `size`, ver Fase 1.4).
  - `duration-800` (progress-ring.tsx:47) É válido no Tailwind v4 (gera `transition-duration:.8s`
    no CSS buildado). Não mexer.
  - Template literals interpolando cor em className (`text-${x}-400`): **0 ocorrências** no repo.
    Não há classes quebradas por purge.

---

## 2. Diagnóstico consolidado (evidências)

### 2.1 Causa raiz dos "campos colados": não existe componente de formulário

`components/ui/` tem 11 componentes, mas **nenhum** `input.tsx`, `select.tsx`, `textarea.tsx`,
`label.tsx`, `field.tsx` ou `form.tsx`. Cada tela estiliza campos à mão. Resultado: **~11 variantes
distintas de input** convivendo no app:

| # | Onde (arquivo:linha) | Altura | Radius | Foco | Placeholder |
|---|---|---|---|---|---|
| A | login/page.tsx:165 (`inputClass`) | h-14 | rounded-2xl | border + **ring-2** primary/20 | `text-text-muted` |
| B | onboarding/page.tsx:192 | h-14 | rounded-2xl | border só | `text-slate-500` |
| C | race-calendar-section.tsx:209 | h-12 | rounded-2xl | border/60 + ring-1 | `text-slate-500` |
| D | create-race-form.tsx:88,133 · configuracoes:558,572 · api-keys:232 | h-12 | rounded-xl | border só | `text-slate-600` |
| E | log-supplement-sheet.tsx:128 | h-11 | rounded-2xl | border só | `text-slate-500` |
| F | race-simulation-form.tsx:54 | h-11 | rounded-xl | border/60 + ring-1 | `text-slate-500` |
| G | customize-protocol-sheet.tsx:39 | **h-9** | rounded-xl | border/60 + ring-1 | `text-slate-500` |
| H | race-sim:55 · log-modal:264,275 | **h-9** | rounded-lg | misto ou **nenhum** | misto |
| I | customize:42 · log-modal:234 | **h-8** | rounded-lg | misto ou **nenhum** | misto |
| J | product-autocomplete.tsx:126 | h-14 | **rounded-full + border-2** | border só | `text-slate-500` |
| K | steppers "pílula" (create-race:185-241, log-supplement:172-194) | input transparente | — | `outline-none` | — |

5 alturas, 4 raios, 4 tratamentos de foco, 4 placeholders, bg oscilando entre `bg-bg-surface`,
`bg-bg-input`, `bg-bg-elevated`, `bg-[#1c262f]`, `bg-[#283139]`. O login (variante A) é o único
formulário 100% tokenizado — é o **baseline**.

**Pontos "colados" específicos (corrigir na Fase 1):**
- `nutricao/page.tsx:439,453` — label `text-[10px]` seguido direto do input, sem `mb`/gap nenhum.
- `race-simulation-form.tsx:74,88` — idem, label colado no campo.
- `customize-protocol-sheet.tsx:146` — grid de 4 nutrientes `grid-cols-4 gap-1.5` (6px) num sheet
  estreito; `:148,157` labels `text-[9px]` sem margem.
- `onboarding/page.tsx:549-597` — grids de dados fisiológicos com `space-y-1.5` (6px) label→input.
- `api-keys-section.tsx:257,271` — listas de scopes `space-y-1.5`.
- `configuracoes/page.tsx:479` — lista de menu `space-y-1` (4px).
- `protocol-comparison.tsx:102` — barras Prescrito/Real com `space-y-1`.

**Touch targets < 44px (mobile-first!):**
- Inputs h-8/h-9 (32-36px): log-modal:234,264,275 · customize:40,43 · race-sim:55 ·
  intra-workout-suggestion-card:196-265 (~10 campos h-8).
- Botões: configuracoes:133 (`py-2` ≈34px), :123 (40px), :376 (32px) · api-keys:127 (~30px),
  :238-251, :293-306, :428 (40px) · onboarding:771,801 (h-10), :686 · customize:110-114 (~28px),
  :129-133 (ícone sem dimensão) · treino/page:194,220 (setas 36px) · nutricao:307 (36px) ·
  intra-workout:178 (36px), :208 (32px).

### 2.2 Cards: 11 receitas para o mesmo papel visual

As classes do design system `.surface`/`.card`/`.card-elevated`/`.card-glow`
(globals.css:145-170) têm **0 usos** — todo card reimplementa a receita inline. Variações
encontradas (amostra):

- Dominante: `rounded-card bg-bg-surface p-6 ring-1 ring-hairline shadow-card` (recovery-card:99,
  wellness-card:161, pmc-chart:107, +7).
- Mesma receita com p-5 (upcoming-races:61, dashboard:600,667), p-8 (dashboard:707,870),
  px-5 py-4 (daily-cockpit:216), sem shadow (daily-cockpit:150,183,198).
- `rounded-2xl` (16px) em vez de `rounded-card` (20px): stat-card:19, skeleton do dashboard:270
  (o skeleton não bate com o card real que representa), ai-analysis-card:110, trends-chart:20,
  readiness-score:17, atividades/[id]:285.
- `border border-slate-800/50` em vez de `ring-1 ring-hairline`: activity-row:47-49,
  ai-analysis:110, trends-chart:20, treino/page:259-265, +muitos.
- `rounded-xl` (12px) em card de stats: treino/[id]:134-141,420-444.
- Radius arbitrário: log-pending-card:47 `rounded-[1.8rem]`.
- Superfície por hex cru: race-plan-card:53 `bg-[#1c262f]`, treino/page:259 idem.

Padding de card mistura p-4/p-5/p-6/p-8 sem regra; tiles internos misturam
`rounded-2xl p-3/p-3.5` e `rounded-xl p-2/p-2.5/p-3` (fatigue-strain-card usa p-3.5 no 1º tile e
p-3 nos outros dois do MESMO grid — :69 vs :73,82).

### 2.3 Espaçamento/ritmo de página

- Ritmo raiz diverge por tela: dashboard `space-y-8`, nutricao `space-y-8`, demais `space-y-6`;
  treino/[id] usa `pt-4` (todas as outras `pt-6`/`py-6`).
- dashboard:551 — `mt-6` dentro de um bloco stagger quebra o ritmo `space-y-8` do pai.
- dashboard:756-757 — seção Alertas usa `SectionLabel mb-0` + `space-y-3`; nas outras o
  SectionLabel tem `mb-3` (dois espaçamentos título→conteúdo).
- Só 4 de ~10 seções do dashboard usam `<SectionLabel>`; o resto usa `<h3>` interno próprio.
- Padding-bottom duplicado: shell `(app)/layout.tsx:15` já dá `pb: calc(120px + safe-area)` e as
  telas de detalhe somam `pb-28`/`pb-36` por cima (atividades/[id]:243, treino/[id]:366).

### 2.4 Cores: paleta dupla + 4 problemas estruturais

**Volume:** 885 linhas com cor crua do Tailwind (app/ = 292 em 10 arquivos; components/ = 593 em
41). Piores: readiness-card 56, api-keys 53, onboarding 52, configuracoes 51, atividades/[id] 50,
treino/[id] 41. Limpos (referência): login, stat-card, section-label, bottom-nav, dashboard/page (1).

**Problemas estruturais além do volume:**
1. **Hex fora de qualquer token:** `#101a22` (treino/[id]:494, atividades/[id]:301,555,
   configuracoes:412, nutrition-timeline:55), `#111518` (bottom-sheet.tsx:51 — o fundo do
   BottomSheet difere dos sheets inline que usam `bg-bg-surface`), `#1c242c` e `#2c353d`
   (log-pending-card:47, dashboard ×3 — gradientes bespoke intencionais dos cards de treino,
   promover a token em vez de remover).
2. **Hex duplicando token existente:** `bg-[#1c262f]`≡bg-surface e `bg-[#283139]`≡bg-input em
   dezenas de linhas (onboarding, configuracoes, nutricao, race-calendar, customize, race-sim,
   treino/*, atividades/*); `[#1d8fed]`≡primary ×12 em atividades/*.
3. **Dois sistemas de cor de disciplina:** activity-row.tsx:24-27 usa cyan/blue/orange/purple-400
   cru; discipline-badge e race-plan-timeline usam os tokens `swim/bike/run/brick`.
4. **Quatro vermelhos para "ruim/fadiga":** `#ef4444` (token danger), `#f43f5e` (rose-500 — linha
   ATL em pmc-chart-inner:146, recovery-card:29,117, daily-cockpit:116), `rose-400` e `rose-300`
   em textos. No pmc-chart o gradiente TSB negativo usa `#ef4444` e a linha usa `#f43f5e` — dois
   vermelhos no mesmo card.
5. **Trilho de barra de progresso sem token:** `bg-slate-800` cru em readiness:265,
   target-race:120,139, race-predictor:142, fatigue:48, recovery:149, protocol-comparison:106,119.
6. **Charts (recharts) com hex hardcoded em props JS:** pmc-chart-inner:145-147 (`#3b82f6`,
   `#f43f5e`, `#22c55e`), ReferenceLine `#fbbf24` (≠ token warning `#f59e0b`),
   weight-chart-inner:61-89 e weekly-load-chart-inner:73 (tudo `#3b82f6` — peso, carga e CTL
   pintados do mesmo azul genérico). Tooltip inline idêntico copiado 3× (bg `#283139`, borda
   `#334155` — ambos têm token).
7. **alert-banner.tsx:15-18:** fundo/borda por token (`bg-warning/10`) mas texto em cor crua de
   outro matiz (`text-amber-200` etc.).

### 2.5 Tipografia e hierarquia

- Título de card dominante: `font-heading text-base font-bold text-slate-100` (~10 cards — cor
  crua na camada mais visível); divergentes: upcoming-races:64 (text-sm uppercase + token),
  text-lg e text-xl espalhados.
- H1 de página sem escala: treino e atividades `text-3xl`, nutricao `text-[28px]` (arbitrário),
  tendencias e race-day `text-xl`, atividades/[id] tem H1 `text-lg` MENOR que o H2 `text-2xl`
  logo abaixo (:253 vs :267).
- Micro-labels uppercase com 6 trackings diferentes (`0.08em`, `0.12em`, `0.14em`, `0.15em`,
  `0.18em`, `wider`, `widest`) e tamanhos 9/10/11px (9px é ilegível em mobile —
  readiness-card:182,205, daily-cockpit:159, customize:148).
- `font-[var(--font-heading)]` e `font-heading` usados de forma intercambiável (mesmo efeito,
  duas grafias — padronizar `font-heading`).

### 2.6 Outras inconsistências estruturais

- **Segmented control reimplementado à mão** em atividades/page:168 em vez da classe `.segmented`
  do design system.
- **z-index sem escala:** 7 overlays diferentes em z-50; product-autocomplete z-[60];
  treino/[id]:494 footer fixo SEM z-index (funciona por sorte — a bottom-nav é ocultada na rota).
- **Footer de atividades/[id]:554-555 sem `max-w-lg mx-auto`** (o de treino/[id]:496 tem) —
  desalinha do conteúdo em telas largas.
- **HeaderSkeleton ≠ Header real** (dashboard:240 vs :445): skeleton sem `-mx-4 px-4` e com
  opacidade diferente → "pulo" de layout ao carregar.
- **Sparkline width fixo 96px** (daily-cockpit:192) pode comprimir/estourar em telas <360px.
- **Feedback de ação:** não há toast; AlertBanner inline é o padrão (ok manter), mas o componente
  não define `role="alert"`/`aria-live` internamente — cada consumidor faz por fora.
- `lucide-react` é dependência morta (0 imports) — remover só junto de um `npx pnpm@9 install`
  (senão quebra o frozen-lockfile do Render).
- **Doc desatualizado:** `docs/projeto/layout_design_system.md` (v1.0) descreve primária cyan
  `#00F5C4`, fontes Barlow Condensed/DM Sans e ícones Lucide — nada disso é o código real
  (azul `#1d8fed`, Lexend, Material Symbols). Atualizar para v2 ao final da Fase 3.

---

## 3. Direção de design premium

Conceito mantido: **"Athletic Instrument"** — instrumento de precisão para atleta, dark-first,
dados como protagonistas. O que muda: profundidade maior entre camadas, acentos mais
disciplinados (menos Tailwind-500 genérico), e UMA paleta.

### 3.1 Paleta v2 — Opção A (recomendada): evoluir o azul

Evolução, não revolução: mantém a identidade azul atual, aprofunda o fundo (mais contraste
percebido entre camadas = sensação premium) e afina os acentos. Risco baixo, migração gradual.

```css
/* Fundos — mais profundos, mesma temperatura azulada */
--color-bg-base:     #0A1017;   /* antes #0d161d — quase-preto azulado */
--color-bg-surface:  #151E28;   /* antes #1c262f */
--color-bg-elevated: #1E2A36;   /* antes #283139 */
--color-bg-input:    #1E2A36;
--color-bg-overlay:  #04080C;

/* Novos tokens (hoje inexistentes, causa de cor crua) */
--color-track:            #2A3642;  /* trilho de barra/progresso (substitui bg-slate-800) */
--color-card-gradient-hi: #2c353d;  /* gradientes bespoke dos cards de treino (promovidos) */
--color-card-gradient-lo: #1c242c;

/* Primária — mesma família, um degrau mais vivo p/ fundo mais escuro */
--color-primary:        #2196F5;   /* antes #1d8fed */
--color-primary-bright: #4FB1FF;
--color-primary-hover:  #1877CC;
--color-primary-dim:    #2196F514;

/* Semânticos — 1 tom por significado (mata os 4 vermelhos) */
--color-danger:  #F0524E;   /* ÚNICO vermelho do app (substitui #ef4444, #f43f5e, rose-300/400) */
--color-success: #2FD583;
--color-warning: #F5A524;
--color-info:    #4C9AF0;

/* Séries de gráfico — NÃO reusar semânticos (ver regra 3.3) */
--color-metric-fitness: #4C9AF0;   /* CTL */
--color-metric-fatigue: #F0524E;   /* ATL */
--color-metric-form:    #2FD583;   /* TSB */
--color-metric-weight:  #B48CF2;   /* peso — hoje é azul igual a tudo */
--color-metric-load:    #38BDF2;   /* carga semanal */
```

Disciplinas (`swim/bike/run/brick`) e Strava ficam como estão — já têm identidade. Hairline,
sombras, radius e fontes (Lexend + JetBrains Mono) permanecem: já são bons.

### 3.2 Paleta v2 — Opção B (mais radical): cyan "Athletic Instrument"

Resgatar a primária cyan elétrica `#00F5C4` do design system original
(`docs/projeto/layout_design_system.md`), estilo WHOOP. Muda a cara do app inteiro e briga com
o azul de CTL/bike/info — exigiria redesenhar os acentos do dashboard.

**Decisão do Daniel antes da Fase 3.** Padrão na ausência de resposta: **Opção A**.
As Fases 0-2 independem dessa escolha.

### 3.3 Regras de uso de cor (valem para todo código novo)

1. JSX nunca usa cor crua do Tailwind nem hex em className — só tokens.
2. Cor de série de gráfico vem de `--color-metric-*` via `lib/chart-theme.ts` (única ponte
   tokens→recharts). Nunca importar hex direto num componente de chart.
3. Semânticos (`success/warning/danger/info`) só para ESTADO (feedback, alerta, validação) —
   não para "decorar" métricas.
4. 1 significado = 1 cor. Se dois elementos significam o mesmo (fadiga alta, erro), usam o
   mesmo token.
5. Texto sobre `*-dim`/`*/10`: usar o próprio token no texto (ex.: `text-warning`), nunca um
   matiz vizinho (`text-amber-200`).

---

## 4. Plano de execução por fases

Cada fase é independente, com commit/push/bump próprios. Ordem recomendada: 0 → 1 → 2 → 3 → 4.

### Fase 0 — Correções estruturais e bugs (esforço: ~meio dia)

| # | Tarefa | Onde |
|---|---|---|
| 0.1 | Substituir hex fora de token: `#101a22` → `bg-base` (com alpha quando gradiente), `#111518` → `bg-surface` | treino/[id]:494 · atividades/[id]:301,555 · configuracoes:412 · nutrition-timeline:55 · bottom-sheet:51 |
| 0.2 | Promover gradientes bespoke a tokens `card-gradient-hi/lo` e usar | log-pending-card:47 · dashboard (2 usos de `#1c242c`/`#2c353d`) |
| 0.3 | Escala de z-index como tokens/comentário canônico: sticky=10, nav=40, overlay=50, popover=60; dar `z-30` ao footer de treino/[id]:494 | globals.css + arquivos citados em 2.6 |
| 0.4 | Footer de atividades/[id]:554 ganha `max-w-lg mx-auto` (igual ao de treino/[id]:496) | atividades/[id]/page.tsx |
| 0.5 | HeaderSkeleton = Header real (mesmo `-mx-4 px-4` e opacidade) | dashboard/page.tsx:240 vs 445 |
| 0.6 | Skeletons com o mesmo radius do conteúdo real (`rounded-card`) | dashboard/page.tsx:270 |
| 0.7 | Remover `pb-28`/`pb-36` das telas de detalhe (o shell já dá `pb` com safe-area) OU remover do shell — escolher UM dono do padding-bottom | (app)/layout.tsx:15 · atividades/[id]:243 · treino/[id]:366 |
| 0.8 | Sparkline do cockpit: largura responsiva (`max-w`/viewBox) em vez de `width=96` fixo | daily-cockpit.tsx:192 |
| 0.9 | Tiles do fatigue-strain com padding igual (p-3) | fatigue-strain-card.tsx:69,73,82 |
| 0.10 | activity-row migra para tokens de disciplina `swim/bike/run/brick` | activity-row.tsx:24-27 |
| 0.11 | AlertBanner: `role="alert"` interno + texto usando o próprio token (`text-warning` etc., não amber-200) | alert-banner.tsx:15-18,24-47 |
| 0.12 | atividades/page usa a classe `.segmented` do design system | atividades/page.tsx:168 |

**Aceite:** build passa; screenshot das telas dashboard/treino/atividades/nutrição sem regressão
visual perceptível (exceto onde o fix é a própria mudança, ex.: 0.4).

### Fase 1 — Sistema de formulário: mata os "campos colados" (esforço: ~1 dia)

1. **Criar primitivos em `components/ui/`** (Radix `react-label` e `react-select` já estão
   instalados e sem uso):
   - `input.tsx`, `textarea.tsx`, `select.tsx` — receita única (base = variante A do login):
     `h-12 px-4 rounded-xl bg-bg-input border border-border-strong/50 text-[15px]
     placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20
     focus:outline-none transition-colors`. Prop `size`: `lg` h-14 (auth/hero), `md` h-12
     (padrão), `sm` h-11 (denso — **mínimo absoluto 44px**; h-8/h-9 deixam de existir).
   - `label.tsx` — `text-xs font-semibold text-text-secondary` (mínimo 11px; nunca 9-10px).
   - `field.tsx` — wrapper `label + controle + hint/erro` com espaçamento embutido:
     label→controle `gap-2` (8px), hint/erro `mt-1.5`.
   - `stepper.tsx` — extrai o padrão "pílula com −/+" (variante K) de create-race-form e
     log-supplement-sheet, com `focus-within` visível.
2. **Regras de respiro (aplicar via Field, não caso a caso):** campo→campo `space-y-4` (16px)
   mínimo; grupo→grupo `space-y-6/8`; grids de campos `gap-x-3 gap-y-4`; proibido `space-y-1`/
   `space-y-1.5` entre label e controle ou entre campos.
3. **Migrar os 12 formulários** para os primitivos (ordem: onboarding → configuracoes →
   api-keys → race-calendar → create-race → log-modal → log-supplement → customize-protocol →
   race-sim → nutricao/page presets → intra-workout (10 campos h-8) → product-autocomplete*).
   *product-autocomplete pode manter `rounded-full` como exceção intencional de busca, mas com
   foco e placeholder padronizados.
4. **Button ganha prop `size`** (`sm` h-10 só para contexto não-primário, `md` h-12, `lg` h-14)
   — eliminar todos os `className="h-14 ..."`/`h-10` dos callers (onboarding:771,801 ·
   race-calendar:471,476,479 · create-race:262).
5. **Corrigir os pontos colados listados em 2.1** que não forem absorvidos pelos primitivos
   (customize `grid-cols-4 gap-1.5` → `grid-cols-2 gap-x-3 gap-y-4`; scopes/menus `space-y-1.5`
   → `space-y-2.5`; protocol-comparison `space-y-1` → `space-y-2`).
6. **Touch targets:** tudo clicável ≥44px (botões de ícone `w-11 h-11`; chips com padding maior).

**Aceite:** grep não encontra mais `h-8`/`h-9` em input; todas as telas de formulário com
screenshot conferido; contagem de variantes de input = 1 (+exceção documentada do autocomplete);
e2e de login/onboarding passando.

### Fase 2 — Sistema de cards e ritmo de página (esforço: ~1 dia)

1. **Uma receita canônica de card** em globals.css (atualizar `.surface`/`.card` para a receita
   real dominante e PASSAR A USAR): card de topo = `rounded-card bg-bg-surface border
   border-hairline shadow-card p-5`; hero/empty-state p-6/p-8 conscientes; tile interno =
   `rounded-card-inner bg-bg-elevated p-3` com `gap-3`. Escolher UM mecanismo de borda
   (recomendado: `border`, não `ring`) e aplicar em todos.
2. **Radius:** `rounded-card` (20px) para card de topo em TODAS as telas — eliminar
   `rounded-2xl`/`rounded-xl`/`rounded-[1.8rem]` nesse papel (stat-card:19, skeleton:270,
   ai-analysis:110, trends-chart:20, readiness-score:17, atividades/[id]:285,
   treino/[id]:134,420-444, race-plan-card:53, log-pending-card:47).
3. **Ritmo de página único:** raiz `py-6 space-y-8` em todas as telas (corrigir treino/[id]
   `pt-4`); seções sempre com `<SectionLabel>` (mb-3 fixo — remover o `mb-0` de dashboard:757 e
   o `mt-6` interno de dashboard:551); grids de tiles `gap-3`, grids de cards `gap-4`.
4. **Headers de página padronizados:** H1 = `font-heading text-2xl font-bold text-text-primary`
   em toda tela interna (hoje: 3xl/28px/xl/lg conforme a tela); back-button e ações com o mesmo
   tamanho/estilo nas 4 telas que têm header com voltar.
5. **Título de card único:** `font-heading text-base font-bold text-text-primary` (migrar os ~10
   `text-slate-100` junto).
6. **Micro-labels: 2 variantes só** — `text-[11px] tracking-[0.08em]` (padrão) e `text-[10px]
   tracking-[0.12em]` (mínimo, tiles densos). Eliminar 9px e trackings 0.14/0.15/0.18/widest.
7. Padronizar grafia `font-heading` (substituir `font-[var(--font-heading)]`).

**Aceite:** screenshot de todas as telas; nenhuma "receita" de card fora da canônica
(`grep -c 'ring-1 ring-hairline'` e `rounded-2xl` em card de topo = 0); ritmo visual uniforme.

### Fase 3 — Paleta premium + migração de cores (esforço: 1-2 dias, POR LOTES)

**Pré-requisito:** decisão A/B da seção 3.2 (default: A).

1. **Aplicar paleta v2 no `@theme`** (só o bloco de tokens — o app inteiro muda junto; é o
   momento "premium" visível). Bump de versão + screenshot geral antes/depois.
2. **Criar `lib/chart-theme.ts`**: exporta as cores `metric-*`, estilos de eixo/grid
   (`#64748b`/`#334155` → tokens text-muted/border-strong) e um componente `<ChartTooltip>`
   único (hoje o tooltip está copiado 3× com hex inline). Migrar pmc-chart-inner,
   weight-chart-inner, weekly-load-chart-inner, trends-chart, readiness-score, ai-analysis
   (ScoreRing). Legenda do pmc-chart passa a usar as MESMAS constantes das linhas
   (hoje: swatch `bg-rose-500` vs linha `#f43f5e` em sistemas separados).
3. **Um vermelho só:** substituir `#f43f5e`/rose-500/rose-400/rose-300 por `danger` (ou
   `metric-fatigue` quando for série ATL) — pmc-chart-inner:103-106,146 · recovery-card:29,117 ·
   daily-cockpit:116 · textos rose-* do dashboard.
4. **Token `track`** substitui todo `bg-slate-800` de trilho (7+ ocorrências mapeadas em 2.4.5).
5. **Migração dos ~885 usos crus, por lotes com screenshot-diff** (mesmo hex = no-op visual).
   Ordem de lote: (a) hex-duplicando-token `bg-[#1c262f]`/`bg-[#283139]`/`[#1d8fed]` — busca e
   troca mecânica; (b) `slate-*` de texto/borda → `text-text-*`/`border-*` (tabela de
   equivalência no CLAUDE.md da memória: slate-100→text-primary, 400→secondary, 500→muted,
   600→faint, slate-800 borda→border-strong ou track); (c) acentos de status
   (amber/green/red/blue-500 em badges) → semânticos; (d) acentos "decorativos" do dashboard
   (blue-400=CTL etc.) → `metric-*` — este lote MUDA levemente o tom, revisar screenshot com
   atenção.
6. Atualizar `docs/projeto/layout_design_system.md` para v2 (paleta real, Lexend, Material
   Symbols, receitas canônicas de card/input) — hoje o doc descreve um design que nunca foi
   implementado.

**Aceite:** `grep -rE '\b(text|bg|border|ring|from|to|via)-(slate|gray|zinc|blue|emerald|rose|amber|red|green|cyan|orange|purple|yellow|sky)-[0-9]'`
em app/ e components/ retorna ~0 (exceções documentadas em comentário no código);
0 hex em className; charts consumindo só chart-theme.

### Fase 4 — Polish premium (opcional, backlog)

- Estados vazios com ilustração/ícone + CTA (hoje há containers secos).
- Padronizar feedback: manter AlertBanner (com aria da Fase 0) e avaliar toast leve para ações
  rápidas (nova dep — decisão do Daniel; lembrar do frozen-lockfile).
- Micro-interações: transição de página, press-scale consistente (já existe em partes).
- Remover `lucide-react` (dep morta) no próximo `npx pnpm@9 install` planejado.
- Varredura de acessibilidade: contraste 4.5:1 nos secundários sobre bg novo, `aria-label` em
  botões de ícone.

---

## 5. Critérios de aceite globais (qualquer fase)

1. `npx pnpm@9 --filter web build` (conferir script exato no package.json) passa sem warning novo.
2. Screenshot das 8 telas principais (dashboard, treino, treino/[id], atividades,
   atividades/[id], nutrição, configurações, login) antes/depois — diff intencional apenas.
3. Versão bumpada em `apps/web/lib/version.ts` + push único + confirmação da versão no ar.
4. Nenhuma cor crua nova, nenhum hex novo em className, nenhum valor fora da escala de spacing.
5. Touch targets novos ≥44px; foco visível em tudo que é interativo.

## 6. Referências no código (bons exemplos a copiar)

- `app/(auth)/login/page.tsx` — formulário 100% tokenizado, foco correto (variante A).
- `components/ui/stat-card.tsx`, `section-label.tsx`, `bottom-nav.tsx` — componentes limpos.
- `components/nutrition/daily-nutrition-card.tsx` — card no padrão do design system
  (`rounded-card + ring-hairline + shadow-card`), dots de fase por token.
- `globals.css` — fonte única de tokens; sombras/animações/reduced-motion já corretos.
