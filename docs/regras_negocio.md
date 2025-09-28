# Regras de Negócio - Fase 1 (MVP)

## Objetivo
Permitir que o atleta registre suplementação consumida em treinos, integrando atividades de plataformas de terceiros (Garmin, Strava ou TrainingPeaks).

---

## Fluxos Principais

### 1. Sincronização de Atividades
- O usuário conecta sua conta (Garmin, Strava ou TrainingPeaks).
- O sistema importa automaticamente os treinos concluídos.
- Dados mínimos importados:
  - Data e hora
  - Tipo de atividade (corrida, ciclismo, natação, etc.)
  - Duração
  - Distância
  - Frequência cardíaca média (se disponível)

### 2. Registro de Suplementação
- O usuário pode lançar suplementação **pré**, **durante** ou **pós-treino**.
- Lançamento pode ser:
  - **Manual**: selecionando produto e quantidade.
  - **Presets**: atalhos configurados pelo usuário (ex.: "Gel 30g carbo").
- Informações mínimas por item:
  - Nome/Produto
  - Quantidade/Porções
  - Categoria (gel, isotônico, cápsula de sal, barra, etc.)
  - Fase (pré/durante/pós)

### 3. Consolidação
- Cada atividade terá vinculado:
  - Dados do treino (sincronizados)
  - Registro de suplementação (lançado pelo usuário)
- O sistema exibirá um **resumo nutricional** simples:
  - Total de carboidratos (g)
  - Cafeína (mg)
  - Sódio (mg)
  - Energia (kcal)

---

## Regras e Restrições
- Só é possível lançar suplementação em atividades sincronizadas.
- Suplementação pode ser adicionada ou editada a qualquer momento após o treino.
- Não há obrigatoriedade de lançar suplementação (atividade pode ficar sem registro).
