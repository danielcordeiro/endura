# Layout, Campos e Frontend - Fase 2 (Versão com IA)

## Objetivo
Adicionar recursos de OCR, NLP e insights visuais no app.

---

## Telas Novas/Ajustadas

### 1. Tela de Registro de Suplementação (Aprimorada)
- **Botões de entrada**:
  - [Adicionar Manual]
  - [Tirar Foto]
  - [Digitar Texto]
- **Fluxo da Foto**:
  - Usuário fotografa → sistema exibe prévia com nutrientes reconhecidos → usuário confirma ou edita.
- **Fluxo do Texto**:
  - Usuário digita → sistema sugere parsing em itens → usuário confirma.

---

### 2. Tela de Detalhe da Atividade (Aprimorada)
- **Dados do treino**: já existentes (tipo, duração, distância).
- **Dados do ambiente**:
  - Temperatura (início/média)
  - Umidade
  - Vento
- **Resumo nutricional (cartões)**:
  - Carboidratos g/h
  - Cafeína total
  - Sódio mg/h
  - Kcal total
- **Insight da IA** (bloco com destaque):
  - Texto curto (ex.: “Sua ingestão de carbo ficou abaixo do recomendado para 2h30 → pode impactar no rendimento.”)
  - Score/confiança exibido.

---

### 3. Tela de Insights Gerais
- Lista de treinos com resumo de IA:
  - Data
  - Tipo de treino
  - Consumo médio (g/h carbo, mg/h sódio, cafeína total)
  - Alertas (ícones coloridos)
- Filtro: por período (últimos 7 dias, 30 dias, 3 meses).
