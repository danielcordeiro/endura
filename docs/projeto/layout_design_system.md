# Endura — Design System

*Referência visual completa. Todos os documentos de layout derivam deste.*

> **v2.0 (2026-07-05):** este documento foi reconciliado com o código real do
> app (`apps/web/app/globals.css`) após a evolução de UI/design descrita em
> `docs/plans/2026-07-05-evolucao-ui-design.md`. A v1.0 abaixo descrevia uma
> paleta (cyan `#00F5C4`), fontes (Barlow Condensed/DM Sans) e ícones (Lucide)
> que nunca chegaram a ser implementados — o texto foi atualizado para
> refletir o que existe de fato: paleta azul (`--color-primary`), fonte
> Lexend + JetBrains Mono, ícones Material Symbols.

---

## 1. Direção de Design

**Conceito:** *Athletic Instrument* — o app deve parecer um instrumento de precisão para atletas, não um app de bem-estar genérico. Referências visuais: computador de bordo de bike de alto desempenho, relógio Garmin Fenix, cronômetro de prova.

**Pilares:**
- **Dark-first:** atletas treinam às 5h da manhã. Fundo escuro é funcional, não decorativo.
- **Dados como protagonistas:** números grandes, legíveis, sem fricção.
- **Densidade controlada:** informação densa mas respirável — cada tela tem uma hierarquia clara.
- **Cores com semântica:** cada disciplina, fase nutricional e nível de alerta tem cor própria e consistente.

---

## 2. Paleta de Cores (v2 — implementada em `app/globals.css` @theme)

### 2.1 Fundos e Superfícies

```
--color-bg-base:     #0A1017   ← fundo principal (preto azulado profundo)
--color-bg-surface:  #151E28   ← cards, painéis
--color-bg-elevated: #1E2A36   ← tiles internos, modais, campos de formulário
--color-bg-input:    #1E2A36   ← igual a bg-elevated
--color-bg-overlay:  #04080C   ← backdrop de modais/sheets
--color-track:       #2A3642  ← trilho de barra/progresso
--color-hairline:    #ffffff1f ← borda 1px sutil de card (branco 12%)
--color-border:            #1e293b80
--color-border-strong:     #334155
--color-border-focus:      #2196F5
```

### 2.2 Texto

```
--color-text-primary:   #F1F5F9   ← texto principal
--color-text-secondary: #94A3B8   ← labels, metadados
--color-text-muted:     #64748B   ← placeholders, legendas
--color-text-faint:     #475569   ← desabilitado, texto mais discreto
--color-text-inverse:   #0D161D   ← texto em fundo claro (botão branco de alto contraste)
```

### 2.3 Cor Primária (Endura)

```
--color-primary:        #2196F5   ← azul elétrico — CTA, progresso, ativo
--color-primary-bright: #4FB1FF
--color-primary-dim:    #2196F514 ← versão ~8% opacidade (fundos de badge, ring track)
--color-primary-hover:  #1877CC
```

### 2.4 Disciplinas

```
--color-swim:   #06B6D4   ← natação — ciano
--color-bike:   #3B82F6   ← ciclismo — azul
--color-run:    #F97316   ← corrida — laranja
--color-brick:  #A855F7   ← brick/triathlon completo — violeta
```

### 2.5 Fases Nutricionais

```
--color-phase-pre:    #EAB308   ← pré-treino (amarelo = preparação)
--color-phase-during: #2196F5   ← durante (= primary, ativo)
--color-phase-post:   #F97316   ← pós-treino (laranja = recuperação)
```

### 2.6 Estados e Alertas

Um tom só por significado — não reciclar cor de disciplina/gráfico para status.

```
--color-success: #2FD583
--color-warning: #F5A524
--color-danger:  #F0524E
--color-info:    #4C9AF0

--color-success-dim: #2FD58315
--color-warning-dim: #F5A52415
--color-danger-dim:  #F0524E15
```

### 2.7 Séries de gráfico

Nunca importar hex direto num componente de chart — sempre via
`apps/web/lib/chart-theme.ts` (`CHART_COLORS`), que é a ponte entre estes
tokens e as props do recharts (que não resolve `var()` com segurança em
atributos SVG).

```
--color-metric-fitness: #4C9AF0   ← CTL
--color-metric-fatigue: #F0524E   ← ATL
--color-metric-form:    #2FD583   ← TSB
--color-metric-weight:  #B48CF2
--color-metric-load:    #38BDF2
```

---

## 3. Tipografia

`--font-heading` e `--font-body` apontam para a mesma família (Lexend) — não
há uma fonte de display separada implementada. `--font-mono` é usada em todo
valor numérico (métricas, TSS, datas inline) para dar a leitura "instrumento"
mesmo sem uma condensada dedicada.

| Role | Fonte (token) | Peso | Tamanho |
|---|---|---|---|
| Metric (números grandes) | `--font-mono` (JetBrains Mono) | 700 | 24–72px conforme o card |
| Heading 1 | `--font-heading` (Lexend) | 700 | 24–28px |
| Heading 2 | `--font-heading` (Lexend) | 600 | 18–20px |
| Heading 3 | `--font-heading` (Lexend) | 600 | 16px |
| Body | `--font-body` (Lexend) | 400 | 14–15px |
| Body Strong | `--font-body` (Lexend) | 600 | 14–15px |
| Caption | `--font-body` (Lexend) | 400 | 11–12px |
| Label | `--font-body` (Lexend) | 700 | 10–11px uppercase + tracking [0.08em–0.12em] |
| Data inline | `--font-mono` (JetBrains Mono) | 400–700 | 12–14px |

**Carregamento:** `next/font/google` (Lexend) + `next/font/local` ou Google
Fonts para JetBrains Mono, sempre com `display: swap` — ver o `<head>`/layout
raiz de `apps/web/app` para a implementação atual.

---

## 4. Espaçamento

Escala baseada em múltiplos de 4px:

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px    ← padding padrão de card
--space-5:  20px
--space-6:  24px    ← gap entre seções
--space-8:  32px    ← separação maior
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

**Safe areas (mobile):**
- Top: status bar = 44–48px
- Bottom: navigation bar = 56px + safe area inset
- Padding horizontal de conteúdo: 16px

---

## 5. Componentes Base

### 5.1 Stat Card

Bloco de métrica individual. Usado em grids 2×2 ou row scrollável.

```
┌─────────────────────────┐
│  LABEL ─────────────    │  ← --label, --text-secondary
│                         │
│  342                    │  ← --metric, --text-primary
│                         │
│  unidade / contexto     │  ← --caption, --text-muted
└─────────────────────────┘
bg: --color-bg-surface
border: 1px solid --color-hairline
border-radius: --radius-card (20px) — classe utilitária `rounded-card`
padding: 16–20px
```

Receita canônica em `app/globals.css` — classes `.surface`/`.card` (sinônimos,
a mesma regra). Para tiles aninhados dentro de um card, usar `--radius-card-inner`
(16px, classe `rounded-card-inner`), nunca reinventar um raio arbitrário.

**Variantes:**
- `stat-card--highlight`: borda esquerda 3px solid var(--color-primary)
- `stat-card--warn`: borda esquerda 3px solid var(--color-warning)
- `stat-card--danger`: borda esquerda 3px solid var(--color-danger)

### 5.2 Activity Row

Item de lista de atividades.

```
┌──────────────────────────────────────────────────────┐
│  [ÍCONE]  Corrida Leve Z2           09:15   ›        │
│  [🏃 run]  Seg 17 Fev · 48min · 8.2km               │
│            ●● Nutrição registrada                    │
└──────────────────────────────────────────────────────┘

Ícone: circle 40px, bg = var(--run)/15%, ícone = var(--run)
Título: body-strong
Meta: caption, text-secondary
Badge nutrição: dot verde (registrada) / dot cinza (vazia)
```

### 5.3 Progress Ring

Anel de progresso circular — usado no dashboard para % do plano.

```
      ╭────────╮
    ╱            ╲     ← track: --primary-dim
   │    73%        │   ← fill: --primary (stroke-dashoffset animation)
   │   concluído   │   ← texto central
    ╲            ╱
      ╰────────╯
```

SVG + CSS custom property `--progress` animado com `transition: stroke-dashoffset 0.8s ease`.

### 5.4 Nutrition Timeline

Linha do tempo horizontal de protocolos nutricionais.

```
PRÉ                    DURANTE                       PÓS
─────────────────────────────────────────────────────────
 ●──────────────●──────────────●──────────────●─────●
-45'           0'            +45'          +1h30   +2h
 Banana        Largada         Gel           Gel    Proteína
 +Eletrólito   Isotônico       Água          Água   +Carbo

Linha: 1px dashed --border
Dots: 10px circle, cor = fase (--phase-pre / --phase-during / --phase-post)
Label: caption, abaixo do dot
```

### 5.5 Discipline Badge

Pílula compacta indicando a modalidade.

```
[ 🏃 RUN ]   [ 🚴 BIKE ]   [ 🏊 SWIM ]   [ 🔥 BRICK ]
```

```
bg:     var(--[discipline])/15%
color:  var(--[discipline])
font:   --label (11px uppercase)
padding: 4px 10px
border-radius: 999px
```

### 5.6 Phase Tag

```
[ PRÉ ]   [ DURANTE ]   [ PÓS ]
```

Mesma estrutura do Discipline Badge, cores = `--phase-*`.

### 5.7 Alert Banner

```
┌─────────────────────────────────────────────────────┐
│  ⚠  Ingestão de carboidratos abaixo do esperado     │
│     para 2h30 de esforço. Pode afetar performance.  │
└─────────────────────────────────────────────────────┘
bg: --warning-dim
border-left: 3px solid --warning
border-radius: 8px
padding: 12px 16px
icon: 16px warning
text: body, --text-primary
```

Variantes: `--success-dim / --danger-dim` com ícone correspondente.

### 5.8 Bottom Sheet

Modal que sobe do fundo. Usado para formulários rápidos.

```
┌──────────────────────────────┐
│         ──── (handle)        │  ← drag handle 32×4px, --border
│                              │
│  [conteúdo do form]          │
│                              │
│  [ Cancelar ]  [ Salvar ▸ ]  │
└──────────────────────────────┘

bg: --bg-elevated
border-radius: 20px 20px 0 0
animation: translateY(100%) → translateY(0), ease-out 250ms
backdrop: rgba(0,0,0,0.6)
```

### 5.9 Botão Primário

```
[ INICIAR TREINO  ▸ ]

bg: --primary
color: --text-inverse
font: body-strong + uppercase + tracking
height: 52px
border-radius: 10px
width: 100% (mobile)
```

**Estados:**
- `hover`: scale(1.02), brightness(1.1)
- `active`: scale(0.98)
- `loading`: spinner inline, opacity 0.7
- `disabled`: opacity 0.35, cursor not-allowed

### 5.10 Botão Secundário / Ghost

```
[ + Adicionar Consumo ]

bg: transparent
border: 1px solid --color-border
color: --color-text-primary
```

### 5.11 Campo de Formulário (Input / Select / Textarea / Stepper)

Primitivos em `apps/web/components/ui/{input,textarea,label,field,select,stepper}.tsx`.
Todo formulário deve compor `<Field>` em vez de montar `label` + controle +
erro manualmente — é o que elimina o efeito "campos colados" (labels sem
espaçamento consistente, mensagens de erro sem posição fixa, alturas de
input divergentes entre telas).

```
<Field label="Peso" hint="opcional" error={errors.peso}>
  <Input type="number" {...register('peso')} />
</Field>

┌ Peso ──────────────────── (label, --color-text-secondary, 12px) ─┐
│ [ 72.5                                                    kg ]   │  ← Input, h-11, bg-bg-input
└ opcional / mensagem de erro (--color-danger se error) ───────────┘
```

- `Field` reserva o espaço da mensagem de erro/hint (evita layout shift).
- `Input`/`Textarea`/`Select` compartilham altura, radius e estado de foco
  (ring `--color-border-focus`) — nunca estilizar um `<input>` cru fora
  desse conjunto.
- `Stepper` (+/- ) é o padrão para valores numéricos incrementais (ex.:
  quantidade, séries) em vez de um `<input type="number">` isolado.

---

## 6. Navegação

### 6.1 Bottom Navigation Bar (atleta)

```
┌────────────────────────────────────────────────────┐
│  [🏠]      [📅]      [⚡]      [🥗]      [⚙️]     │
│  Hoje     Plano   Atividade  Nutrição   Perfil    │
└────────────────────────────────────────────────────┘
height: 56px + safe-area-inset-bottom
bg: --bg-elevated
border-top: 1px solid --border
tab ativo: ícone + label em --primary
tab inativo: ícone em --text-muted, sem label
```

### 6.2 Header de Tela

```
┌──────────────────────────────────────────┐
│  ‹  Corrida Leve Z2        [···]  [↑]   │
└──────────────────────────────────────────┘
height: 56px
back arrow: 24px, --text-primary
título: heading-3
ações: ícones 24px à direita
bg: --bg-base (com blur se scrolled)
```

---

## 7. Ícones de Disciplina

O app usa a fonte de ícones **Material Symbols** (`<span class="material-symbols-outlined">nome</span>`),
não Lucide — `lucide-react` está no `package.json` mas sem uso real no app
(candidato a remoção, ver plano de evolução Fase 4). Referência canônica:
`apps/web/components/ui/discipline-badge.tsx`.

| Disciplina | Ícone Material Symbols | Cor |
|---|---|---|
| Natação | `pool` | `--color-swim` |
| Ciclismo | `directions_bike` | `--color-bike` |
| Corrida | `directions_run` | `--color-run` |
| Triathlon/Brick | (sem badge dedicado hoje) | `--color-brick` |
| Descanso | `moon` | `--color-text-muted` |

---

## 8. Motion / Animações

| Interação | Animação | Duração | Easing |
|---|---|---|---|
| Entrada de tela | fade-in + translateY(12px→0) | 300ms | ease-out |
| Bottom Sheet abre | translateY(100%→0) | 250ms | ease-out |
| Bottom Sheet fecha | translateY(0→100%) | 200ms | ease-in |
| Cards na lista (stagger) | fade-in, delay +40ms por item | 250ms | ease-out |
| Progress ring fill | stroke-dashoffset | 800ms | ease-in-out |
| Stat card hover | scale(1.02), brightness(1.05) | 150ms | ease |
| Botão press | scale(0.97) | 80ms | ease |
| Skeleton loading | shimmer horizontal | ∞ | linear |

**Princípio:** Uma animação de entrada bem orquestrada (stagger) vale mais do que micro-interações espalhadas.

---

## 9. Skeleton Loading

Todos os estados de carregamento usam skeleton (nunca spinner isolado):

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-surface) 25%,
    var(--bg-elevated) 50%,
    var(--bg-surface) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 6px;
}
```

---

## 10. Responsividade

O app é **mobile-first** (PWA). Breakpoints:

```
mobile:  390px  (base — iPhone 14 Pro)
tablet:  768px  (iPad mini — layout em 2 colunas)
desktop: 1280px (se necessário — painel treinador)
```

Em mobile, toda a navegação é por bottom nav.
Em tablet/desktop, sidebar lateral de 240px substitui o bottom nav.

---

## 11. Accessibility

- Contraste mínimo: **4.5:1** para texto normal, **3:1** para texto grande e ícones
- Touch targets: mínimo **44×44px**
- Focus visible: `outline: 2px solid --primary, offset 2px`
- Textos em ícones: sempre `aria-label` ou `title`
- Cores nunca são o único indicador de estado — sempre acompanhadas de ícone ou texto

---

*Endura Design System v1.0 | Fevereiro 2026*
