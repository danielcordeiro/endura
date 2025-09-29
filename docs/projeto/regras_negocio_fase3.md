# Regras de Negócio - Fase 3 (Versão Treinador)

## Objetivo
Permitir que treinadores acompanhem os dados de seus alunos, visualizando treinos, suplementação registrada e insights de performance.

---

## Fluxos Principais

### 1. Acesso do Treinador
- O treinador terá um **perfil específico** (conta com permissão de treinador).
- O aluno deve **autorizar** o treinador a visualizar seus dados.
- Cada treinador pode ter vários alunos associados.

### 2. Visualização de Dados
- O treinador acessa um painel consolidado com:
  - Lista de alunos
  - Treinos recentes de cada aluno
  - Suplementação registrada
  - Insights de IA por treino

### 3. Detalhe do Aluno
- O treinador pode abrir o perfil de um aluno e ver:
  - Resumo de treinos (últimos 7, 30, 90 dias)
  - Nutrição média por treino (g/h, mg/h, cafeína total)
  - Tendências de performance (melhora, queda, risco de fadiga)
  - Eventos adversos reportados (GI, cãibras, etc.)

### 4. Comunicação
- O treinador pode deixar **comentários/observações** vinculados a um treino específico.
- Comentários ficam visíveis apenas para treinador e aluno.

---

## Regras e Restrições
- O aluno controla quem pode acessar seus dados (convite/aceitação).
- O treinador não pode editar registros do aluno, apenas visualizar e comentar.
- Insights de IA são compartilhados com o treinador de forma idêntica ao que o aluno vê.
