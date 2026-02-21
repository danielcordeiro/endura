# Layout & UX — Fase 2 (IA, OCR, NLP e Insights)

*Estende a Fase 1. Consulte [layout_design_system.md](layout_design_system.md) e [layout_frontend.md](layout_frontend.md).*

---

## Telas novas / modificadas nesta fase

1. [Detalhe da Atividade (v2)](#1-detalhe-da-atividade-v2) — clima + insights IA
2. [Registro por Foto (OCR)](#2-registro-por-foto-ocr)
3. [Registro por Texto (NLP)](#3-registro-por-texto-nlp)
4. [Insights Gerais](#4-insights-gerais)
5. [Lista de Compras Semanal](#5-lista-de-compras-semanal)
6. [Registro de Suplementação (v2)](#6-registro-de-suplementação-v2) — novos modos de entrada

---

## 1. Detalhe da Atividade (v2)

Mesma estrutura da Fase 1, com dois blocos novos inseridos abaixo das métricas.

```
┌──────────────────────────────┐
│  ‹  Bike Endurance     [···] │
│                              │
│  [🚴 BIKE]                   │
│  Bike Endurance              │
│  Dom 16 Fev · 07:30          │
│                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 2h10 │ │ 62km │ │ 138  │ │  ← stats já existentes
│  │ dur. │ │      │ │ bpm  │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ─── CONDIÇÕES ─────────── ← NOVO
│                              │
│  ┌────────────────────────┐  │
│  │ 🌡 28°C início  26° méd│  │
│  │ 💧 62% umidade         │  │
│  │ 💨 14 km/h vento       │  │
│  └────────────────────────┘  │
│                              │
│  ─── NUTRIÇÃO PRESCRITA ───  │
│  ... (mesmo da Fase 1)       │
│                              │
│  ─── CONSUMO REGISTRADO ───  │
│  ... (mesmo da Fase 1)       │
│                              │
│  ─── RESUMO NUTRICIONAL ──── ← APRIMORADO
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │ 45g/h    │ │ 680mg/h  │   │  ← Stat Cards com contexto
│  │ CARBO    │ │  SÓDIO   │   │
│  │ ↑ recom: │ │ ↑ recom: │   │
│  │ 60g/h    │ │ 800mg/h  │   │  ← comparação com recomendado
│  └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐   │
│  │  75mg    │ │  940     │   │
│  │ CAFEÍNA  │ │  KCAL    │   │
│  │ total    │ │  total   │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ─── INSIGHT DA IA ──────── ← NOVO
│                              │
│  ┌────────────────────────┐  │
│  │ ⚠ Carbo abaixo do      │  │  ← Alert banner warning
│  │ recomendado            │  │
│  │                        │  │
│  │ Para 2h10 em dia quente│  │
│  │ (28°C), o ideal seria  │  │
│  │ 60–70g/h. Você ingeriu │  │
│  │ 45g/h. Em provas longas│  │
│  │ isso pode resultar em  │  │
│  │ queda de performance   │  │
│  │ na última hora.        │  │
│  │                        │  │
│  │ Confiança: ●●●●○ 0.82  │  │  ← score visual (dots preenchidos)
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ ✓ Sódio adequado       │  │  ← insight success
│  │ Ingestão dentro da     │  │
│  │ faixa para alta sudore-│  │
│  │ se e calor.            │  │
│  │ Confiança: ●●●●● 0.95  │  │
│  └────────────────────────┘  │
│                              │
│  [ + Adicionar consumo ]     │
│  [ ⚑ Relatar evento adv. ]   │
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Score de confiança visual:**
- 5 dots (●●●●●): alta confiança (0.85–1.0)
- 4 dots (●●●●○): boa confiança (0.70–0.84)
- 3 dots (●●●○○): confiança média (0.55–0.69)
- 2 dots (●●○○○): baixa — exibir aviso "resultado estimado"
- Abaixo de 0.55: não exibir o insight

**Stat Cards aprimorados:**
- Se valor < recomendado: borda `--warning`, seta `↓` em `--warning`
- Se valor > recomendado: borda `--danger`, seta `↑` em `--danger`
- Se valor dentro: borda `--success`

---

## 2. Registro por Foto (OCR)

Fluxo acessível via novo botão "Tirar Foto" no bottom sheet de registro.

### 2.1 Câmera / Preview

```
┌──────────────────────────────┐
│  ‹  Identificar produto      │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   [viewfinder ativo]   │  │  ← câmera nativa do device
│  │                        │  │
│  │  Aponte para o rótulo  │  │  ← overlay texto centralizado
│  │  do produto            │  │
│  │                        │  │
│  │         ──┤├──         │  │  ← guia de enquadramento (corners)
│  │         ──┤├──         │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  [  📁 Galeria  ]  [  📷  ]  │  ← botão câmera + opção galeria
└──────────────────────────────┘
```

### 2.2 Processando OCR

```
┌──────────────────────────────┐
│  ‹  Identificando...         │
│                              │
│  ┌────────────────────────┐  │
│  │  [foto capturada]      │  │  ← thumbnail da foto
│  └────────────────────────┘  │
│                              │
│     ⟳  Analisando rótulo...  │  ← spinner + texto
│                              │
│  ─────────────────────────── │
│  ████████████████░░░░        │  ← progress bar animada
└──────────────────────────────┘
```

### 2.3 Resultado OCR — Confirmação

```
┌──────────────────────────────┐
│  ‹  Confirmar produto        │
│                              │
│  ┌────────────────────────┐  │
│  │  [thumbnail da foto]   │  │
│  └────────────────────────┘  │
│                              │
│  Confiança: ●●●●○  0.87      │  ← score de leitura
│                              │
│  PRODUTO IDENTIFICADO        │
│  [ Gel Maurten 25g     ]     │  ← campo editável (pré-preenchido pelo OCR)
│                              │
│  CARBOIDRATOS                │
│  [ 25  ] g       ✎           │  ← editável, ícone de edição
│                              │
│  SÓDIO                       │
│  [ 60  ] mg      ✎           │
│                              │
│  CAFEÍNA                     │
│  [ 0   ] mg      ✎           │
│                              │
│  KCAL                        │
│  [ 100 ]         ✎           │
│                              │
│  ┌──────────┐ ┌───────────┐  │
│  │ Refazer  │ │ Confirmar │  │
│  │  📷      │ │    ▸      │  │
│  └──────────┘ └───────────┘  │
└──────────────────────────────┘
```

Após confirmar → volta ao bottom sheet de registro (tela 7 da Fase 1) com campos pré-preenchidos.

**Regra:** se confiança < 0.70, exibir banner amarelo: *"Leitura incerta — confirme os valores antes de salvar."*

---

## 3. Registro por Texto (NLP)

Modo alternativo no bottom sheet de registro.

### 3.1 Input de Texto Livre

```
┌──────────────────────────────┐
│         ────              │
│  Digitar consumo             │  ← H2
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │  Ex: "2 géis 25g +     │  │  ← textarea, placeholder cinza
│  │  500ml isotônico +     │  │
│  │  1 cápsula de sal"     │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  [ Analisar ▸ ]              │  ← botão primário
│                              │
└──────────────────────────────┘
```

### 3.2 NLP — Resultado Parseado

```
┌──────────────────────────────┐
│         ────              │
│  Confirmar itens             │  ← H2
│                              │
│  A IA identificou 3 itens:   │
│                              │
│  ┌────────────────────────┐  │
│  │ [DURANTE] Gel 25g ×2   │  │  ← card do item, editável
│  │ 50g carbo · 200 kcal   │  │
│  │                   [✎]  │  │  ← editar / [✕] remover
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [DURANTE] Isotônico    │  │
│  │ 500ml · estimado       │  │  ← dados estimados destacados
│  │ 30g carbo · 250mg sód. │  │
│  │                   [✎]  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [DURANTE] Cáps. sal ×1 │  │
│  │ ~400mg sódio           │  │
│  │                   [✎]  │  │
│  └────────────────────────┘  │
│                              │
│  [ + Adicionar item ]        │  ← link
│                              │
│  ┌──────────┐ ┌───────────┐  │
│  │ Corrigir │ │ Salvar ▸  │  │
│  └──────────┘ └───────────┘  │
└──────────────────────────────┘
```

**Notas:**
- Itens com dados estimados (não presentes no texto) mostram "estimado" em `--warning` dim
- Toque em `[✎]` abre mini-form inline para editar aquele item
- Toque em `[✕]` remove o item com animação de slide-out

---

## 4. Insights Gerais

Nova tela acessível pelo tab [🥗 Nutrição] no bottom nav.

```
┌──────────────────────────────┐
│  Nutrição & Insights         │  ← H1
│                              │
│  [ 7D ][ 30D ][ 3M ]         │  ← filtro de período
│  [TODOS][🏊][🚴][🏃]         │  ← filtro disciplina
│                              │
│  ─── MÉDIA DO PERÍODO ──────  │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │  52g/h   │ │ 740mg/h  │   │  ← stats médios
│  │  CARBO   │ │  SÓDIO   │   │
│  │ ─5% vs   │ │ +2% vs   │   │  ← delta vs período anterior
│  │ mês ant. │ │ mês ant. │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ─── HISTÓRICO ─────────────  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🚴]  Bike Endurance   │  │  ← activity insight row
│  │       Dom 16 · 2h10    │  │
│  │       45g/h · 680mg/h  │  │  ← métricas inline
│  │       [⚠] Carbo baixo  │  │  ← badge de alerta
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🏃]  Corrida Leve Z2  │  │
│  │       Seg 17 · 48min   │  │
│  │       60g/h · 800mg/h  │  │
│  │       [✓] Dentro do    │  │  ← badge success
│  │           esperado     │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🏊]  Nado Técnico     │  │
│  │       Sáb 15 · 45min   │  │
│  │       — sem registro   │  │  ← estado sem dados
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Badge de alerta na row:**
- `[⚠ Carbo baixo]` — bg `--warning-dim`, texto `--warning`
- `[⛔ Sódio crítico]` — bg `--danger-dim`, texto `--danger`
- `[✓ Dentro do esperado]` — bg `--success-dim`, texto `--success`
- `[— sem registro]` — texto `--text-muted`

**Toque na row:** abre detalhe da atividade (tela 1 desta fase) diretamente na seção de insights.

---

## 5. Lista de Compras Semanal

Acessível na tab [🥗 Nutrição] → "Lista desta semana".

```
┌──────────────────────────────┐
│  ‹  Lista de Compras         │
│     Semana 17–23 Fev         │  ← range da semana
│                              │
│  Para cobrir seus 6 treinos  │
│  desta semana você precisa:  │  ← texto intro DM Sans
│                              │
│  ─── GÉIS & BARRAS ─────────  │
│                              │
│  ☐  Gel de carboidrato  ×8   │  ← checkbox (riscado ao marcar)
│     Sugestão: Maurten 25g    │  ← product suggestion, --text-muted
│                              │
│  ☐  Barra energética    ×2   │
│                              │
│  ─── ISOTÔNICO & ÁGUA ──────  │
│                              │
│  ☐  Sachê de eletrólito ×4   │
│  ☐  Água (extra)        ×3L  │
│                              │
│  ─── PROTEÍNA & RECUPERAÇÃO  │
│                              │
│  ☐  Whey / proteína     ×3   │
│     25g por porção           │
│                              │
│  ─── COMIDA REAL ───────────  │
│                              │
│  ☐  Banana              ×6   │
│  ☐  Tâmaras             ×12  │
│                              │
│  [ Compartilhar lista ↑ ]    │  ← share nativo
│                              │
├──────────────────────────────┤
│  [🏠]  [📅]  [⚡]  [🥗]  [⚙️] │
└──────────────────────────────┘
```

**Comportamento:**
- Checkboxes persistem localmente (localStorage)
- Ao marcar, item recebe strikethrough + opacity 0.5
- "Resetar lista" disponível no menu [···]
- Compartilhar: abre share sheet do OS com texto formatado

---

## 6. Registro de Suplementação (v2)

O bottom sheet da Fase 1 ganha novos modos de entrada.

```
┌──────────────────────────────┐
│         ────              │
│  Adicionar consumo           │
│                              │
│  COMO DESEJA REGISTRAR?      │  ← label
│                              │
│  ┌────────┐┌────────┐┌──────┐│
│  │        ││        ││      ││
│  │  ✏️    ││  📷    ││  💬  ││  ← 3 modo buttons
│  │ Manual ││  Foto  ││ Texto││
│  │        ││        ││      ││
│  └────────┘└────────┘└──────┘│
│                              │
│  [se Manual selecionado → exibe form da Fase 1]
│  [se Foto → abre câmera (tela 2)]
│  [se Texto → exibe textarea (tela 3)]
│                              │
└──────────────────────────────┘
```

**Modo buttons:**
- Ícone 32px + label
- Estado selecionado: bg `--primary-dim`, borda `--primary`, texto `--primary`
- Estado default: bg `--bg-surface`, borda `--border`
- Tap: scale pulse 0.95→1.0 em 120ms

---

## Regras Adicionais de UI (Fase 2)

| Regra | Detalhe |
|---|---|
| Confiança sempre visível | Score de IA nunca omitido — usuário deve saber a certeza |
| Editabilidade | Todo valor sugerido pela IA tem ícone `✎` e é editável |
| Disclaimer | Rodapé fixo nas telas de insight: *"Sugestões da IA. Não substituem orientação profissional."* |
| Loading de insight | Skeleton específico para o bloco de insight (3 linhas de texto) |
| Clima ausente | Se localização não disponível: ocultar bloco de condições (não exibir zeros) |
