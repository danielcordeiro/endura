# Integração - Fase 3 (Versão Treinador)

## Objetivo
Permitir relacionamento entre contas de alunos e treinadores e consolidar dados de múltiplos usuários.

---

## Módulos de Integração

### 1. Gestão de Permissões
- Endpoint para **associar aluno ↔ treinador**:
  - Aluno envia convite ao treinador (via e-mail ou código).
  - Treinador aceita convite → cria vínculo no banco.
- Tabela `athlete_coach` para armazenar relações.

### 2. Painel Consolidado
- Endpoints para treinadores:
  - `GET /coach/{id}/athletes` → lista de alunos.
  - `GET /coach/{id}/athletes/{athleteId}/activities` → treinos do aluno.
  - `GET /coach/{id}/athletes/{athleteId}/insights` → insights de IA consolidados.

### 3. Comentários
- Endpoint para criar comentários:
  - `POST /activities/{activityId}/comments`
- Endpoint para leitura:
  - `GET /activities/{activityId}/comments`
- Comentários vinculados ao treinador + aluno.

---

## Estrutura Simplificada do Banco (novas tabelas)

### Tabela `athlete_coach`
- `id` (PK)
- `athlete_id` (FK)
- `coach_id` (FK)
- `status` (pending, active, revoked)
- `created_at`

### Tabela `comments`
- `id` (PK)
- `activity_id` (FK)
- `author_id` (FK → coach)
- `text`
- `created_at`
