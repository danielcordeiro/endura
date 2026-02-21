# Layout & UX — Fase 1 (MVP)

*Consulte [layout_design_system.md](layout_design_system.md) para tokens de cor, tipografia e componentes base.*

---

## Telas do MVP

1. [Splash & Onboarding](#1-splash--onboarding)
2. [Login / Auth](#2-login--auth)
3. [Dashboard — Hoje](#3-dashboard--hoje)
4. [Treino do Dia](#4-treino-do-dia)
5. [Lista de Atividades](#5-lista-de-atividades)
6. [Detalhe da Atividade](#6-detalhe-da-atividade)
7. [Registro de Suplementação](#7-registro-de-suplementação)
8. [Configurações & Perfil](#8-configurações--perfil)

---

## 1. Splash & Onboarding

### 1.1 Splash Screen

```
┌──────────────────────────────┐
│                              │
│                              │
│                              │
│          ENDURA              │  ← Barlow Condensed 700, 52px, --primary
│   PERFORMANCE PARA           │  ← DM Sans 400, 14px, --text-secondary
│      TRIATLETAS              │
│                              │
│      ────────────            │  ← barra de progresso animada (--primary)
│                              │
└──────────────────────────────┘
bg: --bg-base
animação: logo fade-in 600ms + tagline slide-up 400ms delay 300ms
```

### 1.2 Onboarding — Passo 1/5: Perfil Atlético

```
┌──────────────────────────────┐
│  ●●○○○  Perfil Atlético  ›   │  ← progress dots + label + skip
├──────────────────────────────┤
│                              │
│  Qual é o seu nível atual?   │  ← H2
│                              │
│  ┌──────────────────────┐    │
│  │  🥉 Iniciante        │ ●  │  ← radio card selecionado (borda --primary)
│  │  Menos de 1 ano      │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  🥈 Intermediário    │ ○  │
│  │  1 a 3 anos de prova │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  🥇 Competitivo      │ ○  │
│  │  Pódio é objetivo    │    │
│  └──────────────────────┘    │
│                              │
│  Seu ponto mais fraco?       │  ← H3
│                              │
│  [ 🏊 SWIM ] [ 🚴 BIKE ] [ 🏃 RUN ]  │  ← toggle chips, seleção única
│                              │
│  Disponibilidade semanal     │  ← H3
│  ──────────────────────────  │
│  [ S ][ T ][ Q ][ Q ][ S ][ S ][ D ]  │  ← dias da semana, multi-select
│                              │
│  Horas por dia: ────●────    │  ← slider 0.5–3h, step 0.5
│  1.5h/dia                    │
│                              │
│        [ Continuar ▸ ]       │  ← botão primário
└──────────────────────────────┘
```

**Comportamento:**
- Radio cards: borda `--primary` 2px + bg `--primary-dim` no estado selecionado
- Dias da semana: círculos 36px, selecionados = bg `--primary`, texto `--text-inverse`
- Slider: track `--border`, fill `--primary`, thumb 20px circle `--primary`

---

### 1.3 Onboarding — Passo 2/5: Prova Alvo

```
┌──────────────────────────────┐
│  ●●○○○  Prova Alvo       ›   │
├──────────────────────────────┤
│                              │
│  Qual distância você vai     │  ← H2
│  disputar?                   │
│                              │
│  ┌────────┐ ┌────────┐       │
│  │SPRINT  │ │OLÍMPICO│       │  ← grade 2×2, botões de seleção
│  │750m/20k│ │1.5k/40k│       │
│  │/5k     │ │/10k    │       │
│  └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐       │
│  │ 70.3   │ │  FULL  │       │
│  │1.9k/90k│ │3.8k/180│       │
│  │/21k    │ │k/42k   │       │
│  └────────┘ └────────┘       │
│                              │
│  Data da prova               │  ← H3
│  [ 15 de junho de 2026 ▼ ]   │  ← date picker nativo (input type=date)
│                              │
│  Objetivo                    │  ← H3
│  ○ Terminar a prova          │
│  ○ Bater tempo específico    │
│                              │
│  [se "bater tempo"]          │
│  Tempo alvo  [ 4h 30min ]    │  ← input mascarado HH:MM
│                              │
│        [ Continuar ▸ ]       │
└──────────────────────────────┘
```

---

### 1.4 Onboarding — Passo 3/5: Dados Fisiológicos

```
┌──────────────────────────────┐
│  ●●●○○  Dados Fisiológicos ›│
├──────────────────────────────┤
│                              │
│  Peso    [ 72   ] kg         │  ← input numérico grande
│  Altura  [ 175  ] cm         │
│                              │
│  FC máxima                   │
│  [ 182  ] bpm                │
│  ○ Não sei — estimar para mim │  ← checkbox; se marcado, oculta o campo
│                              │
│  FTP de bike (opcional)      │
│  [ 220  ] watts              │
│                              │
│  Pace de corrida (5km)       │
│  [ 5:20 ] min/km             │
│  ○ Não sei — pular           │
│                              │
│        [ Continuar ▸ ]       │
└──────────────────────────────┘
```

---

### 1.5 Onboarding — Passo 4/5: Perfil Nutricional

```
┌──────────────────────────────┐
│  ●●●●○  Nutrição         ›   │
├──────────────────────────────┤
│                              │
│  Restrições alimentares      │
│  [                        ]  │  ← chips multiselect ou texto livre
│                              │
│  O que você já usa? (multi)  │
│  [Gel] [Isotônico] [Barra]   │  ← chips selecionáveis
│  [Cápsula de sal] [Cafeína]  │
│                              │
│  Estômago sensível?          │
│  [ ○ Sim   ● Não ]           │  ← toggle
│                              │
│  Suda muito?                 │
│  [ ● Sim   ○ Não ]           │
│                              │
│  Já teve câimbras em provas? │
│  [ ● Sim   ○ Não ]           │
│                              │
│        [ Continuar ▸ ]       │
└──────────────────────────────┘
```

---

### 1.6 Onboarding — Passo 5/5: Integrações

```
┌──────────────────────────────┐
│  ●●●●●  Conecte seu relógio  │
├──────────────────────────────┤
│                              │
│  Para enviar treinos direto  │
│  para seu relógio, conecte   │
│  o intervals.icu:            │
│                              │
│  ┌──────────────────────┐    │
│  │  ○  intervals.icu    │    │
│  │  [Conectar ▸]        │    │  ← OAuth redirect
│  └──────────────────────┘    │
│                              │
│  Para importar seu histórico │
│  de atividades:              │
│                              │
│  ┌──────────────────────┐    │
│  │  ○  Strava           │    │
│  │  [Conectar ▸]        │    │  ← OAuth redirect
│  └──────────────────────┘    │
│                              │
│  [✓ intervals.icu conectado] │  ← estado pós-OAuth, badge verde
│  [✓ Strava conectado]        │
│                              │
│  [ Pular por enquanto ]      │  ← link, --text-muted
│        [ Gerar meu plano ▸ ] │  ← CTA principal
└──────────────────────────────┘
```

---

## 2. Login / Auth

```
┌──────────────────────────────┐
│                              │
│          ENDURA              │  ← logo
│                              │
│  ┌──────────────────────┐    │
│  │  Email               │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  Senha               │    │
│  └──────────────────────┘    │
│                              │
│  [ ENTRAR ]                  │  ← botão primário full-width
│                              │
│  ─────────── ou ───────────  │
│                              │
│  [  Entrar com Strava  ]     │  ← botão laranja #FC4C02 (cor oficial Strava)
│                              │
│  Não tem conta?              │
│  [ Criar conta ]             │  ← link --primary
└──────────────────────────────┘
```

**Notas:**
- O botão Strava usa `#FC4C02` (laranja oficial) independente do design system
- "Entrar com Strava" é o fluxo primário — email/senha é secundário
- Após OAuth Strava: se primeiro acesso → redireciona para onboarding; se já tem perfil → dashboard

---

## 3. Dashboard — Hoje

```
┌──────────────────────────────┐
│  Bom dia, Pedro  🌤          │  ← DM Sans, saudação + clima
│                              │
│  ┌────────────────────────┐  │
│  │  🔥 BUILD · Semana 6   │  ← badge de fase + semana
│  │                        │  │
│  │        14              │  ← JetBrains Mono 700, 64px, --primary
│  │      DIAS              │  ← DM Sans label
│  │   para a prova         │  ← caption --text-muted
│  │                        │  │
│  │  ████████░░░░  73%     │  ← progress bar do plano
│  │  do bloco concluído    │  │
│  └────────────────────────┘  │
│                              │
│  ─── TREINO DE HOJE ──────   │
│                              │
│  ┌────────────────────────┐  │
│  │  [🏃 RUN]              │  │
│  │  Corrida Tempo Z3–Z4   │  ← título do treino
│  │  50 min · ~9.5 km      │  ← duração + distância estimada
│  │                        │  │
│  │  WU 10' / 3×8' Z4 /   │  ← descrição compacta da estrutura
│  │  CD 10'                │  │
│  │                        │  │
│  │  [ Ver detalhes ▸ ]    │  ← link para tela 4
│  │  [ Enviar ao relógio ] │  ← ação secundária
│  └────────────────────────┘  │
│                              │
│  ─── SEMANA ATUAL ─────────  │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │ TSS      │ │ Treinos  │   │  ← Stat Cards 2×2
│  │  342     │ │  4 / 6   │   │
│  │ semana   │ │ feitos   │   │
│  └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐   │
│  │ Volume   │ │ Consist. │   │
│  │  8.2h    │ │  ████░   │   │
│  │ total    │ │  83%     │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ─── ALERTAS ───────────────  │
│                              │
│  ┌────────────────────────┐  │
│  │ ⚠  Intervals.icu não   │  │  ← Alert banner warning
│  │    sincronizou há 6h   │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │  ← Bottom Nav
└──────────────────────────────┘
```

**Notas de comportamento:**
- Saudação muda por horário: "Bom dia" / "Boa tarde" / "Boa noite"
- Se não há treino hoje: exibe "Dia de descanso" com ícone `moon` e frase motivacional
- Card de treino: toque em qualquer área abre a tela 4
- Stat cards: animação stagger na entrada (40ms de delay entre cada)

---

## 4. Treino do Dia

```
┌──────────────────────────────┐
│  ‹                     [↑]   │  ← back + share
│                              │
│  [🏃 RUN]                    │  ← discipline badge grande
│  Corrida Tempo Z3–Z4         │  ← H1
│  Seg, 17 Fev 2026            │  ← caption, --text-secondary
│                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 50'  │ │ ~9.5 │ │ Z3–4 │ │  ← stat row (duração, distância, zona)
│  │ dur. │ │  km  │ │ int. │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ─── ESTRUTURA ──────────── │
│                              │
│  ┌────────────────────────┐  │
│  │  [AQUECIMENTO]  10 min │  │  ← seção colapsável
│  │  Trote leve Z1, mobi- │  │
│  │  lidade de tornozelos  │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  [PRINCIPAL]   30 min  │  │
│  │  3 séries × 8 min Z4   │  │
│  │  c/ 2 min Z1 entre     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  [DESAQUECIMENTO] 10'  │  │
│  │  Trote Z1 + alongamento│  │
│  └────────────────────────┘  │
│                              │
│  ─── NUTRIÇÃO PRESCRITA ──── │
│                              │
│  ──●─────────────●────●──●── │  ← nutrition timeline
│  -45'            0'  +30' +45'│
│  Banana        Largada Gel  Gel│
│                               │
│  [ Ver protocolo completo ▼ ] │  ← expansível
│                              │
│  [ ENVIAR AO RELÓGIO ▸ ]     │  ← botão primário
│  [ Marcar como concluído ]   │  ← botão ghost (pós-treino)
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Estados do botão "Enviar ao relógio":**
- Default: `[ ENVIAR AO RELÓGIO ▸ ]` (--primary bg)
- Enviando: spinner + "Enviando..."
- Enviado: `[✓ Enviado ao relógio]` (--success bg, desabilitado)
- Erro: `[ ⚠ Tentar novamente ]` (--warning bg)

---

## 5. Lista de Atividades

```
┌──────────────────────────────┐
│  Atividades                  │  ← H1
│                              │
│  [ 7 DIAS ][ 30 DIAS ][ 90D ]│  ← filtro de período, pills
│  [TODOS][🏊][🚴][🏃]         │  ← filtro disciplina
│                              │
│  ─── FEV 2026 ─────────────  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🏃]  Corrida Leve Z2  │  │  ← activity row
│  │       Seg 17 · 48min · 8.2km       │  │
│  │       ● Nutrição registrada        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🚴]  Bike Endurance   │  │
│  │       Dom 16 · 2h10 · 62km         │  │
│  │       ○ Sem nutrição               │  │  ← dot cinza = não registrado
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🏊]  Nado Técnico     │  │
│  │       Sáb 15 · 45min · 2km         │  │
│  │       ● Nutrição registrada        │  │
│  └────────────────────────┘  │
│                              │
│  ─── JAN 2026 ─────────────  │
│  ...                         │
│                              │
│  [Sincronizar manualmente ↺] │  ← botão ghost + ícone refresh
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Notas:**
- Scroll infinito com lazy load (página de 20 itens)
- Pull-to-refresh no topo
- Agrupamento por mês com sticky headers
- Activity row: toque abre tela 6

---

## 6. Detalhe da Atividade

```
┌──────────────────────────────┐
│  ‹  Corrida Leve Z2    [···] │  ← back + menu (editar/excluir)
│                              │
│  [🏃 RUN]                    │
│  Corrida Leve Z2             │  ← H1
│  Segunda, 17 Fev · 09:15     │  ← caption
│                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 48'  │ │ 8.2  │ │ 142  │ │  ← stats row
│  │ dur. │ │  km  │ │ bpm  │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ─── SUPLEMENTAÇÃO ────────  │
│                              │
│  [PRÉ]                       │
│  ┌────────────────────────┐  │
│  │ Banana                 │  │
│  │ 1 unidade · 25g carbo  │  │
│  └────────────────────────┘  │
│                              │
│  [DURANTE]                   │
│  ┌────────────────────────┐  │
│  │ Gel Maurten 25g        │  │
│  │ +45min · 25g carbo     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Gel Maurten 25g        │  │
│  │ +1h30 · 25g carbo      │  │
│  └────────────────────────┘  │
│                              │
│  ─── TOTAL ────────────────  │
│  Carbo: 75g  Sódio: 180mg   │  ← row compacto
│  Cafeína: 0mg  Kcal: 310     │
│                              │
│  [ + Adicionar consumo ]     │  ← botão ghost
│                              │
│  [ ⚑ Relatar evento adverso ]│  ← link pequeno, --text-muted
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Eventos adversos:**
- "Relatar evento adverso" abre um bottom sheet com checkboxes: Problema GI / Câimbras / Tontura / Náusea / Outro

---

## 7. Registro de Suplementação

Bottom sheet que sobe sobre a tela de detalhe da atividade.

```
┌──────────────────────────────┐
│         ────              │  ← drag handle
│  Adicionar consumo           │  ← H2
│                              │
│  FASE                        │  ← label
│  [ PRÉ ][ DURANTE ][ PÓS ]  │  ← toggle segmentado, cor = fase
│                              │
│  PRODUTO                     │
│  [ Gel Maurten 25g      ▼ ]  │  ← input com autocomplete de presets
│                              │
│  QUANTIDADE                  │
│  [ 1   ] porções             │
│                              │
│  NUTRIENTES  (opcional)      │  ← seção colapsável
│  Carbo [ 25  ] g             │
│  Sódio [    ] mg             │
│  Cafeína [  ] mg             │
│  Kcal  [    ]                │
│                              │
│  HORÁRIO NO TREINO           │
│  [ +45 min ]                 │  ← input com formatação "+Xmin" ou "-Xmin"
│                              │
│  ┌──────────┐ ┌───────────┐  │
│  │ Cancelar │ │ Salvar ▸  │  │  ← botões lado a lado
│  └──────────┘ └───────────┘  │
└──────────────────────────────┘
```

**Presets:**
- Campo de produto tem autocomplete que mostra presets salvos do usuário
- "Salvar como preset" aparece como opção ao digitar nome novo

**Validação:**
- Fase é obrigatória
- Produto é obrigatório
- Campos nutricionais são opcionais — salvos como null se vazios
- Horário é opcional

---

## 8. Configurações & Perfil

```
┌──────────────────────────────┐
│  Perfil                      │  ← H1
│                              │
│  ┌────────────────────────┐  │
│  │  [Avatar]  Pedro Lima  │  │
│  │            pedro@mail  │  │
│  └────────────────────────┘  │
│                              │
│  ─── PROVA ALVO ───────────  │
│  Ironman 70.3 Florianópolis  │
│  15 jun 2026 · 14 dias       │  ← contador regressivo
│  [ Alterar prova ]           │  ← link
│                              │
│  ─── INTEGRAÇÕES ──────────  │
│  ┌────────────────────────┐  │
│  │ Strava       [✓ Ativo] │  │  ← badge success
│  │ Última sync: 2h atrás  │  │
│  │ [ Sincronizar ]        │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ intervals.icu [✓ Ativo]│  │
│  │ Última sync: agora     │  │
│  └────────────────────────┘  │
│                              │
│  ─── CONTA ────────────────  │
│  [ Editar perfil atlético ]  │
│  [ Alterar senha ]           │
│  [ Cancelar assinatura ]     │
│                              │
│  [ Sair ]                    │  ← --danger
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

---

## Regras Gerais de UI

| Regra | Detalhe |
|---|---|
| Mobile-first | Viewport base: 390px (iPhone 14 Pro) |
| Touch targets | Mínimo 44×44px em todas as áreas clicáveis |
| Max 2 cliques | Para lançar suplementação: tela de atividade → bottom sheet → salvar |
| Feedback imediato | Todo toque tem feedback visual em < 100ms |
| Estados vazios | Toda lista tem empty state com ilustração e CTA |
| Erros inline | Erros de formulário abaixo do campo, nunca em alert modal |
| Loading | Skeleton sempre, nunca spinner de tela cheia |
| Gestos | Swipe left em activity row revela ação rápida "Adicionar nutrição" |
