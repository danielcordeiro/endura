# Regras de Negócio - Fase 2 (Versão com IA)

## Objetivo
Ampliar o MVP com inteligência artificial para organizar e enriquecer os dados de suplementação e performance.

---

## Fluxos Principais

### 1. Registro de Consumo via Foto
- Usuário tira foto de um produto (gel, cápsula de sal, isotônico, barra, etc.).
- O sistema (IA + OCR) identifica automaticamente:
  - Marca / Produto
  - Porção
  - Carboidratos (g)
  - Sódio (mg)
  - Cafeína (mg)
  - Energia (kcal)
- Caso o reconhecimento não seja 100% confiável, o app solicita confirmação/ajuste do usuário.

### 2. Registro de Consumo via Texto
- Usuário pode digitar em texto livre (ex.: “2 géis 30g + 500ml isotônico”).
- A IA organiza automaticamente em itens nutricionais estruturados.

### 3. Enriquecimento da Atividade
- Atividades sincronizadas passam a ter:
  - Localização inicial do treino/prova.
  - Clima (temperatura, umidade, vento) via API de clima histórico.
- O sistema combina dados do treino com nutrição para gerar **insights**.

### 4. Geração de Insights
- Para cada atividade, a IA gera:
  - Resumo da ingestão (g/h, mg/h, cafeína total).
  - Comparação com recomendações gerais (faixas de carbo, sódio, cafeína).
  - Impacto do clima e duração sobre a ingestão.
  - Alertas de risco (ex.: ingestão baixa, excesso de cafeína, sódio insuficiente em dia quente).

---

## Regras e Restrições
- Sempre exibir a confiança da leitura da IA (ex.: 0.9/1.0).
- Usuário deve poder editar qualquer valor sugerido pela IA.
- Insights são apenas **sugestões**, não substituem orientação profissional.
