# Endura — Design System

*Referência visual completa. Todos os documentos de layout derivam deste.*

---

## 1. Direção de Design

**Conceito:** *Athletic Instrument* — o app deve parecer um instrumento de precisão para atletas, não um app de bem-estar genérico. Referências visuais: computador de bordo de bike de alto desempenho, relógio Garmin Fenix, cronômetro de prova.

**Pilares:**
- **Dark-first:** atletas treinam às 5h da manhã. Fundo escuro é funcional, não decorativo.
- **Dados como protagonistas:** números grandes, legíveis, sem fricção.
- **Densidade controlada:** informação densa mas respirável — cada tela tem uma hierarquia clara.
- **Cores com semântica:** cada disciplina, fase nutricional e nível de alerta tem cor própria e consistente.

---

## 2. Paleta de Cores

### 2.1 Fundos e Superfícies

```
--bg-base:      #090B10   ← fundo principal (preto azulado profundo)
--bg-surface:   #111521   ← cards, painéis
--bg-elevated:  #1A2035   ← modais, overlays, bottom sheets
--bg-input:     #0F1420   ← campos de formulário
--border:       #232B40   ← bordas sutis
--border-focus: #00F5C4   ← borda de input em foco
```

### 2.2 Texto

```
--text-primary:   #F0F4FF   ← texto principal
--text-secondary: #8B95B0   ← labels, metadados
--text-muted:     #4A5270   ← placeholders, desabilitado
--text-inverse:   #090B10   ← texto em fundo claro (botão primário)
```

### 2.3 Cor Primária (Endura)

```
--primary:        #00F5C4   ← cyan elétrico — CTA, progresso, ativo
--primary-dim:    #00F5C420 ← versão 12% opacidade (fundos de badge, ring track)
--primary-hover:  #00D4AB   ← hover state
```

### 2.4 Disciplinas

```
--swim:   #4D9BFF   ← natação — azul
--bike:   #F59E0B   ← ciclismo — âmbar
--run:    #22C55E   ← corrida — verde
--brick:  #A855F7   ← brick/triathlon completo — violeta
```

### 2.5 Fases Nutricionais

```
--phase-pre:    #4D9BFF   ← pré-treino (azul = preparação)
--phase-during: #00F5C4   ← durante (cyan = ativo, primário)
--phase-post:   #FF6B35   ← pós-treino (laranja = recuperação)
```

### 2.6 Estados e Alertas

```
--success:  #22C55E
--warning:  #F59E0B
--danger:   #EF4444
--info:     #4D9BFF

--success-dim: #22C55E20
--warning-dim: #F59E0B20
--danger-dim:  #EF444420
```

---

## 3. Tipografia

| Role | Fonte | Peso | Tamanho |
|---|---|---|---|
| Metric (números grandes) | JetBrains Mono | 700 | 48–72px |
| Heading 1 | Barlow Condensed | 700 | 28px |
| Heading 2 | Barlow Condensed | 600 | 22px |
| Heading 3 | Barlow Condensed | 600 | 18px |
| Body | DM Sans | 400 | 15px |
| Body Strong | DM Sans | 600 | 15px |
| Caption | DM Sans | 400 | 12px |
| Label | DM Sans | 500 | 11px uppercase + letter-spacing 0.08em |
| Data inline | JetBrains Mono | 400 | 14px |

**Carregamento:** Google Fonts ou Fontsource (npm). Sempre com `display: swap`.

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?
  family=Barlow+Condensed:wght@600;700&
  family=DM+Sans:wght@400;500;600&
  family=JetBrains+Mono:wght@400;700&
  display=swap" rel="stylesheet">
```

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
bg: --bg-surface
border: 1px solid --border
border-radius: 12px
padding: 16px
```

**Variantes:**
- `stat-card--highlight`: borda esquerda 3px solid var(--primary)
- `stat-card--warn`: borda esquerda 3px solid var(--warning)
- `stat-card--danger`: borda esquerda 3px solid var(--danger)

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
border: 1px solid --border
color: --text-primary
```

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

Usar [Lucide Icons](https://lucide.dev/) como base + customização por cor:

| Disciplina | Ícone Lucide | Cor |
|---|---|---|
| Natação | `waves` | `--swim` |
| Ciclismo | `bike` | `--bike` |
| Corrida | `footprints` | `--run` |
| Triathlon/Brick | `zap` | `--brick` |
| Descanso | `moon` | `--text-muted` |

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
