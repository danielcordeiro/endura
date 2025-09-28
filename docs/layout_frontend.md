# Layout, Campos e Frontend - Fase 1 (MVP)

## Objetivo
Definir telas e campos para o registro de suplementação e visualização de treinos importados.

---

## Telas Principais

### 1. Tela de Login/Conexão
- Botão: “Conectar com Strava”
- Exibe status da conexão:
  - ✅ Conta conectada
  - ❌ Não conectado

---

### 2. Lista de Atividades
- Exibe atividades sincronizadas (últimos 30 dias).
- Campos na lista:
  - Data
  - Tipo (ícone: corrida, bike, natação)
  - Duração
  - Distância
  - Status de nutrição (✔️ lançado / ❌ não lançado)

---

### 3. Detalhe da Atividade
- **Dados do treino**
  - Tipo
  - Data/Hora
  - Duração
  - Distância
  - FC média (se disponível)

- **Aba: Suplementação**
  - Botão [+ Adicionar Consumo]
  - Lista dos itens já lançados:
    - Produto
    - Quantidade
    - Carbs (g), Sódio (mg), Cafeína (mg)

---

### 4. Cadastro de Suplemento (Modal/Form)
- Campos:
  - Produto (texto livre ou seleção de preset)
  - Quantidade/Porção (número)
  - Fase: [Pré, Durante, Pós] (dropdown)
  - Campos nutricionais (opcionais):
    - Carboidratos (g)
    - Sódio (mg)
    - Cafeína (mg)
    - Kcal

- Botões:
  - [Salvar] → grava e volta à atividade
  - [Cancelar]

---

## Regras de UI
- Tudo deve ser otimizado para mobile (PWA/Ionic).
- Fluxo simples (máx. 2 cliques para lançar suplementação).
- Cores e ícones ajudam a identificar fases (Pré = azul, Durante = verde, Pós = laranja).
