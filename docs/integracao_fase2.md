# Integração - Fase 2 (Versão com IA)

## Objetivo
Integrar camadas de OCR, NLP e dados de clima para enriquecer atividades com suplementação estruturada.

---

## Módulos de Integração

### 1. OCR / Reconhecimento de Produto
- Uso de API (Google Vision, AWS Rekognition, Tesseract OCR) para extrair texto do rótulo.
- Pipeline:
  1. Foto enviada → OCR processa.
  2. IA interpreta texto (quantidades e nutrientes).
  3. Produto cadastrado/atualizado no banco.

### 2. NLP para Texto Livre
- Usuário envia texto (ex.: “1 gel + 1 cápsula sal”).
- Pipeline de NLP identifica:
  - Quantidade
  - Unidade
  - Produto
  - Nutrientes (carbs, sódio, cafeína, kcal).

### 3. API de Clima Histórico
- Provedores possíveis: Open-Meteo, Meteostat, Visual Crossing.
- Entrada: lat/lon + horário da atividade.
- Saída: temperatura, vento, umidade.
- Dados gravados no `activity` para uso nos insights.

---

## Estrutura Simplificada do Banco (novos campos)

### Tabela `product_variant` (ajuste)
- `confidence NUMERIC` → confiança da leitura da IA.
- `source TEXT` → “manual”, “ocr”, “nlp”.

### Tabela `activity`
- `env_temp_start_c`
- `env_temp_avg_c`
- `env_humidity_pct`
- `env_wind_mps`
- `env_source`

### Nova tabela `ai_insight`
- `id` (PK)
- `activity_id` (FK)
- `category` (carbs, sodium, caffeine, hydration)
- `insight TEXT`
- `recommendation TEXT`
- `score NUMERIC`
