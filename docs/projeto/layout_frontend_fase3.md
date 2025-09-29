# Layout, Campos e Frontend - Fase 3 (Versão Treinador)

## Objetivo
Criar telas específicas para treinadores acompanharem os alunos.

---

## Telas Novas

### 1. Tela de Lista de Alunos
- Campos exibidos:
  - Nome do aluno
  - Último treino sincronizado (tipo + data)
  - Status (ativo, pendente)
- Botão: [Adicionar Aluno] (abre convite)

---

### 2. Tela de Perfil do Aluno
- Seções:
  - **Resumo**:
    - Total de atividades no período
    - Distância total
    - Tempo total
  - **Nutrição média**:
    - Carbo g/h
    - Sódio mg/h
    - Cafeína média
  - **Tendência de Performance** (gráfico simples)
- Aba [Treinos]:
  - Lista de atividades com data, tipo, duração, distância, status de nutrição.

---

### 3. Tela de Detalhe do Treino (Versão Treinador)
- Dados da atividade (mesmo que o aluno vê).
- Resumo nutricional.
- Insight de IA.
- **Seção de comentários**:
  - Lista de observações existentes.
  - Campo [Adicionar comentário].

---

## Regras de UI
- O treinador deve ter uma visão mais **consolidada** e menos detalhista do que o aluno, mas com acesso a abrir detalhes quando necessário.
- Permitir filtros rápidos (últimos 7, 30, 90 dias).
- Uso de ícones/cores para alertas de performance/nutrição.
