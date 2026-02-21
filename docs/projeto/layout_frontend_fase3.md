# Layout & UX — Fase 3 (Módulo Treinador)

*Estende as Fases 1 e 2. Consulte [layout_design_system.md](layout_design_system.md).*

---

## Contexto de Design

O treinador tem uma **visão consolidada** — menos granularidade, mais padrões e tendências. A UI deve comunicar rapidamente o estado geral de cada aluno sem forçar drill-down para o óbvio.

**Diferenças visuais da visão treinador vs. atleta:**
- Sidebar lateral no lugar do bottom nav (tablet/desktop preferido pelo treinador)
- Paleta de identidade idêntica, mas cabeçalho de conta com badge `TREINADOR`
- Telas de aluno preservam a identidade visual do atleta (o treinador "vê a tela do aluno")

---

## Telas

1. [Acesso como Treinador](#1-acesso-como-treinador)
2. [Dashboard do Treinador — Lista de Alunos](#2-dashboard-do-treinador--lista-de-alunos)
3. [Perfil do Aluno](#3-perfil-do-aluno)
4. [Detalhe do Treino do Aluno (com comentários)](#4-detalhe-do-treino-do-aluno-com-comentários)
5. [Adicionar Aluno — Fluxo de Convite](#5-adicionar-aluno--fluxo-de-convite)

---

## 1. Acesso como Treinador

Mesmo login da Fase 1. Após autenticação, o sistema detecta a role e redireciona para o painel do treinador.

```
┌──────────────────────────────┐
│                              │
│  ENDURA               [TREINADOR] │  ← badge distinto no header
│                              │
│  Bem-vindo, Ana Silva        │
│                              │
│  Você entrou como treinador. │
│  Sua visão está no painel    │
│  de alunos.                  │
│                              │
│  [ Ir para o painel ▸ ]      │
│                              │
│  [ Meus treinos (atleta) ]   │  ← se o treinador também treina
└──────────────────────────────┘
```

---

## 2. Dashboard do Treinador — Lista de Alunos

Layout adaptado para tablet/desktop (sidebar) mas funcional em mobile.

### Mobile

```
┌──────────────────────────────┐
│  Meus Alunos      [+ Aluno]  │  ← H1 + botão de convite
│                              │
│  [ 🔍 Buscar aluno... ]      │
│                              │
│  ─── ATENÇÃO NECESSÁRIA ────  │  ← alunos com alertas primeiro
│                              │
│  ┌────────────────────────┐  │
│  │ [Avatar]  Carlos M.    │  │
│  │           ● Ativo      │  │  ← badge verde
│  │  [🚴] Seg 17 · 2h10   │  │  ← último treino
│  │  [⚠] Carbo abaixo     │  │  ← alerta da IA
│  │  [⛔] 2 treinos perdidos│ │  ← alerta de consistência
│  └────────────────────────┘  │
│                              │
│  ─── EM DIA ────────────────  │
│                              │
│  ┌────────────────────────┐  │
│  │ [Avatar]  Beatriz S.   │  │
│  │           ● Ativo      │  │
│  │  [🏃] Seg 17 · 48min  │  │
│  │  [✓] Semana consistente│  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [Avatar]  Diego F.     │  │
│  │           ◌ Pendente   │  │  ← aguardando aceite do convite
│  │  Convite enviado       │  │
│  │  [ Reenviar ]          │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  [👥 Alunos]  [📊 Relatórios]│  ← Bottom nav do treinador (2 tabs)
└──────────────────────────────┘
```

### Desktop / Tablet (sidebar)

```
┌────────────┬─────────────────────────────────────────┐
│            │  Meus Alunos              [ + Aluno ]   │
│  ENDURA    ├─────────────────────────────────────────┤
│  ────────  │  [🔍 Buscar...]  [TODOS][⚠ ATENÇÃO][✓] │
│            │                                         │
│  👥 Alunos │  ┌──────────────────────────────────┐   │
│  📊 Relat. │  │ Carlos M.  ⚠  Bike · Seg 17      │   │
│            │  │ Carbo abaixo · 2 treinos perdidos │   │
│  ────────  │  └──────────────────────────────────┘   │
│  Ana Silva │  ┌──────────────────────────────────┐   │
│  TREINADOR │  │ Beatriz S. ✓  Run · Seg 17       │   │
│            │  │ Semana consistente                │   │
│  [ Sair ]  │  └──────────────────────────────────┘   │
└────────────┴─────────────────────────────────────────┘
Sidebar: 240px fixo, bg --bg-elevated
Conteúdo: flex-grow, bg --bg-base
```

**Ordenação dos alunos:**
1. Alunos com alertas críticos primeiro (`--danger`)
2. Alunos com alertas de atenção (`--warning`)
3. Alunos em dia (`--success`)
4. Alunos pendentes (convite) por último

---

## 3. Perfil do Aluno

Visão consolidada do aluno. O treinador vê tudo que o atleta vê, mais a camada de análise do treinador.

```
┌──────────────────────────────┐
│  ‹  Carlos Mendes      [···] │  ← back para lista + menu
│                              │
│  ┌──────────────────────┐    │
│  │  [Avatar 56px]       │    │
│  │  Carlos Mendes       │    │  ← H2
│  │  Ironman 70.3 · 14d  │    │  ← prova + countdown
│  │  ● Ativo             │    │
│  └──────────────────────┘    │
│                              │
│  [ 7D ][ 30D ][ 90D ]        │  ← filtro de período
│                              │
│  ─── RESUMO DO PERÍODO ─────  │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │  14      │ │  8.2h    │   │
│  │ TREINOS  │ │ VOLUME   │   │
│  │ realizad.│ │ total    │   │
│  └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐   │
│  │  83%     │ │  342     │   │
│  │ CONSIST. │ │  TSS     │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ─── NUTRIÇÃO MÉDIA ────────  │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │  48g/h   │ │ 690mg/h  │   │
│  │  CARBO   │ │  SÓDIO   │   │
│  │ ↓ baixo  │ │ ok       │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ─── TENDÊNCIA ─────────────  │
│                              │
│  ┌────────────────────────┐  │
│  │  TSS semanal           │  │
│  │  ▁▂▃▄▅▅▄▃  →          │  │  ← sparkline (mini chart)
│  │  Carga crescendo       │  │
│  │  consistentemente      │  │
│  └────────────────────────┘  │
│                              │
│  ─── EVENTOS ADVERSOS ──────  │
│                              │
│  ┌────────────────────────┐  │
│  │ Câimbras (2×)  │ Fadiga│  │  ← chips coloridos dos eventos
│  │ Últimas 4 semanas      │  │
│  └────────────────────────┘  │
│                              │
│  ─── TREINOS RECENTES ──────  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🚴]  Bike Endurance   │  │
│  │       Dom 16 · 2h10    │  │
│  │       [⚠] Carbo abaixo │  │
│  │       [💬 1 comentário] │  │  ← badge de comentário do treinador
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ [🏃]  Corrida Leve     │  │
│  │       Seg 17 · 48min   │  │
│  │       [✓] Dentro esp.  │  │
│  └────────────────────────┘  │
│                              │
│  [ Ver todos os treinos ]    │  ← link
│                              │
├──────────────────────────────┤
│  [👥 Alunos]  [📊 Relatórios]│
└──────────────────────────────┘
```

**Sparkline:**
- Mini gráfico de barras inline (8–10 semanas)
- Altura proporcional ao TSS semanal
- Cor: `--primary` com opacity gradient
- Implementação: SVG simples ou Recharts `<Sparklines>`

**Eventos adversos:**
- Chips com contagem: `Câimbras (2×)`
- Cor: `--warning` para 1–2 ocorrências, `--danger` para 3+
- Toque no chip filtra a lista de treinos pelos treinos com aquele evento

---

## 4. Detalhe do Treino do Aluno (com comentários)

Mesma tela do detalhe da atividade (Fase 2), com bloco de comentários adicionado no final.

```
┌──────────────────────────────┐
│  ‹  Carlos · Bike Endurance  │  ← breadcrumb: treinador > aluno > treino
│                              │
│  [🚴 BIKE]                   │
│  Bike Endurance              │
│  Dom 16 Fev · 07:30          │
│                              │
│  ... (mesmos dados de treino,│
│  clima, nutrição e insight   │
│  da tela de detalhe Fase 2)  │
│                              │
│  ─── OBSERVAÇÕES ───────────  │  ← seção exclusiva do treinador
│                              │
│  ┌────────────────────────┐  │
│  │ [Avatar] Ana Silva     │  │  ← avatar da treinadora
│  │          Hoje · 14:32  │  │  ← timestamp
│  │                        │  │
│  │ Carlos, verifique sua  │  │  ← texto do comentário
│  │ estratégia de carbo    │  │
│  │ nas bikes longas. Tente│  │
│  │ aumentar para 60g/h a  │  │
│  │ partir de 1h de treino.│  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │  ← textarea
│  │  Adicionar observação  │  │
│  │  ...                   │  │
│  │                        │  │
│  └────────────────────────┘  │
│  [ Enviar comentário ▸ ]     │  ← botão ghost, alinha-direita
│                              │
├──────────────────────────────┤
│  [👥 Alunos]  [📊 Relatórios]│
└──────────────────────────────┘
```

**Comentários — Regras:**
- Treinador não pode editar dados do atleta — apenas adicionar comentário
- Comentário enviado: aparece imediatamente na lista (optimistic update)
- Atleta vê os comentários no seu detalhe da atividade, com badge `[💬 1 do treinador]`
- Sem edição/exclusão de comentários (histórico imutável)
- Campo de texto: max 500 caracteres, contador visível abaixo do campo

---

## 5. Adicionar Aluno — Fluxo de Convite

### 5.1 Modal de Convite

```
┌──────────────────────────────┐
│         ────              │
│  Adicionar aluno             │  ← H2
│                              │
│  O aluno receberá um convite │
│  e precisará aceitá-lo.      │
│                              │
│  COMO QUER CONVIDAR?         │
│                              │
│  ○ Por e-mail                │
│  ○ Por código de convite     │
│                              │
│  [se e-mail selecionado]     │
│  E-mail do aluno             │
│  [ email@exemplo.com ]       │
│  [ Enviar convite ▸ ]        │
│                              │
│  [se código selecionado]     │
│  ┌────────────────────────┐  │
│  │  ENDURA-X7K9P          │  │  ← código gerado, fonte mono
│  └────────────────────────┘  │
│  [ Copiar código ] [ 🔄 Gerar novo ] │
│                              │
│  Válido por 48 horas         │  ← caption --text-muted
│                              │
└──────────────────────────────┘
```

### 5.2 Aceite pelo Atleta (tela de notificação)

Quando o atleta abre o app e tem um convite pendente:

```
┌──────────────────────────────┐
│                              │
│  ─── CONVITE PENDENTE ──────  │  ← banner no topo do dashboard
│                              │
│  ┌────────────────────────┐  │
│  │ [Avatar] Ana Silva     │  │
│  │ quer acompanhar seus   │  │
│  │ treinos como treinadora│  │
│  │                        │  │
│  │ [ Recusar ]  [Aceitar ✓] │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

**Comportamento:**
- Se aceitar: vínculo ativado, treinador passa a ver os dados
- Se recusar: convite descartado, nenhuma notificação ao treinador (apenas status "Recusado" na lista)
- Atleta pode revogar acesso a qualquer momento em Configurações → Integrações → Treinadores

---

## Regras Gerais de UI (Fase 3)

| Regra | Detalhe |
|---|---|
| Visão consolidada | Treinador vê médias e tendências, não cada detalhe por padrão |
| Drill-down explícito | Toque no treino abre o detalhe; o default é a view resumida |
| Read-only | Treinador nunca edita dados do atleta — apenas comenta |
| Privacidade visível | Atleta sempre vê quem tem acesso em Configurações |
| Badges de comentário | Atleta vê `[💬 N]` nas atividades comentadas pelo treinador |
| Filtros rápidos | 7 / 30 / 90 dias disponíveis em todas as listas do treinador |
| Alerta por aluno | Ordem da lista de alunos prioriza quem precisa de atenção |
| Sidebar em desktop | Bottom nav (2 tabs) em mobile; sidebar em tablet/desktop ≥ 768px |
