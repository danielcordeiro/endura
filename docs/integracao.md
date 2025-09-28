# Integração - Fase 1 (MVP)

## Objetivo
Definir como a aplicação integrará com plataformas de terceiros (Garmin, Strava ou TrainingPeaks) para importar dados de atividades.

---

## Opções Avaliadas

### Strava API
- **Vantagens**:
  - Autenticação via OAuth simples.
  - Possui Webhooks para receber atividades em tempo real.
  - Dados bem estruturados (streams de tempo, distância, potência, etc.).
- **Desvantagens**:
  - Nem todos os usuários usam Strava.

### Garmin Health API
- **Vantagens**:
  - Fonte direta dos dispositivos Garmin.
- **Desvantagens**:
  - Processo de aprovação burocrático (necessário contrato com a Garmin).
  - Mais demorado para iniciar.

### TrainingPeaks API
- **Vantagens**:
  - Muito usado por triatletas e treinadores.
- **Desvantagens**:
  - API mais restrita, exige cadastro formal.

---

## Decisão Inicial (MVP)
- **Escolher Strava API** para simplificar a primeira versão.

---

## Fluxo de Integração

1. **Autenticação**
   - Usuário conecta a conta Strava via OAuth.
   - Backend armazena `access_token` seguro.

2. **Recepção de Atividades**
   - Strava envia **Webhook** quando uma atividade é criada/concluída.
   - Backend consome a atividade pelo endpoint `/activities/{id}`.

3. **Armazenamento**
   - Dados principais gravados na tabela `activity`:
     - `external_id`, `athlete_id`, `start_time`, `duration`, `distance`, `hr_avg`, `type`.

4. **Associação com Nutrição**
   - Usuário poderá vincular suplementação posteriormente.

---

## Estrutura Simplificada do Banco

### Tabela `activity`
- `id` (PK)
- `external_id` (Strava ID)
- `athlete_id`
- `type`
- `start_time`
- `duration_sec`
- `distance_m`
- `avg_hr`

### Tabela `nutrition_log`
- `id` (PK)
- `activity_id` (FK)
- `phase` (pre, during, post)
- `product_name`
- `servings`
- `carbs_g`
- `sodium_mg`
- `caffeine_mg`
- `kcal`
