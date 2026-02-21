# ENDURA
## Plataforma de Performance para Triatletas

**Documento Mestre de Produto — Visão, Roadmap e Especificações**

> "Endura cria seu plano de treino personalizado com IA, envia direto pro seu relógio e te diz exatamente o que comer em cada treino."

*Versão 2.0 | Fevereiro 2026*

---

## 1. Visão e Posicionamento

O Endura é um SaaS de performance para triatletas amadores que une três pilares ausentes como conjunto nos concorrentes:

1. **Plano de treino IA** — gerado e adaptado automaticamente do primeiro treino até a prova alvo
2. **Nutrição intra-treino prescritiva** — o que comer em cada treino, baseado em dados fisiológicos e clima
3. **Registro e análise retroativa de suplementação** — aprenda com o que você realmente consumiu

O produto nasce como PWA (Progressive Web App), sem publicação em app stores, com custo de infraestrutura inferior a R$ 500/mês para até 500 usuários.

**Público-alvo:** Triatletas amadores (iniciante a competitivo) com prova alvo nas distâncias Sprint, Olímpico, 70.3 ou Full Ironman, que já treinam com relógio (Garmin, Wahoo, Coros, Polar).

---

## 2. Onboarding do Atleta

Todas as informações coletadas uma única vez, em cinco blocos no cadastro:

### 2.1 Perfil Atlético
- Nível: iniciante / intermediário / competitivo
- Histórico de provas completadas e distâncias
- Ponto mais fraco declarado: nado, bike ou corrida
- Disponibilidade semanal: horas/dia e dias livres
- Equipamentos disponíveis: piscina, rolo/smart trainer, esteira

### 2.2 Prova Alvo
- Distância: Sprint / Olímpico / 70.3 / Full
- Data da prova
- Objetivo: terminar ou bater tempo específico

### 2.3 Dados Fisiológicos
- Peso e altura
- FC máxima (estimada automaticamente pelo app se não souber)
- FTP de bike (opcional)
- Pace de corrida de referência (teste de 5km)

### 2.4 Perfil Nutricional
- Restrições alimentares
- Produtos já utilizados: gel, isotônico, barra
- Tolerância gastrointestinal (estômago sensível?)
- Taxa de sudorese e histórico de câimbras
- Eventos adversos já relatados (problemas GI, câimbras, tontura em treinos anteriores)

### 2.5 Integrações
- Conexão com **intervals.icu** via OAuth (ponte universal para dispositivos)
- Conexão com **Strava** via OAuth (sincronização de histórico de atividades)
- Guia passo a passo embutido no onboarding

---

## 3. Módulo de Treino com IA

### 3.1 Geração do Plano

Após o onboarding, a IA gera automaticamente um plano semanal do dia atual até a data da prova:

- Periodização clássica: **Base → Build → Peak → Taper**
- Distribuição de volume por modalidade, ponderando o ponto fraco declarado
- Treinos com aquecimento, séries detalhadas e desaquecimento
- Zonas de esforço por FC ou pace

### 3.2 Adaptação Contínua

- **Checkin semanal:** treinos feitos, sensação subjetiva, qualidade do sono, dores
- IA reajusta a semana seguinte com base no checkin
- 2+ treinos perdidos seguidos: recalcula o bloco inteiro
- **Chat em linguagem natural:** "torci o tornozelo, fico fora 5 dias" → plano se adapta automaticamente

### 3.3 Envio para o Relógio

- Treino do dia enviado automaticamente via intervals.icu API
- Aparece no Garmin / Wahoo / Coros / Polar como treino estruturado
- Notificação push: "Seu treino de amanhã foi enviado para o relógio"
- Suporte a todos os dispositivos compatíveis com intervals.icu

---

## 4. Módulo de Nutrição

### 4.1 Nutrição Intra-Treino Prescritiva ⭐ Diferencial

**Funcionalidade inexistente nos concorrentes diretos.** Para cada treino do plano, a IA gera automaticamente um protocolo nutricional personalizado:

| Momento | Prescrição Exemplo |
|---|---|
| Pré-treino (45min antes) | 1 banana + 500ml água com eletrólitos |
| 00:00 — Largada | 500ml isotônico |
| 00:45 | 1 gel de carboidrato (25g carb) |
| 01:30 | 1 gel + 300ml água |
| 02:00 | 1 barra ou gel conforme sensação |
| Pós-treino (até 30min) | 25g proteína + 50g carbo simples + hidratação |

**Lógica de personalização:**
- Intensidade e duração definem a janela de carboidrato/hora
- Temperatura e umidade previstas ajustam hidratação (integra OpenWeatherMap)
- Histórico de câimbras aumenta sódio automaticamente
- Eventos adversos relatados (problemas GI) ajustam protocolos futuros
- Produtos do estoque do atleta: recomendação com o que ele já tem em casa

### 4.2 Lista de Compras Semanal

- Consolida todos os treinos da semana em lista unificada
- Exemplo: "Você vai precisar de 8 géis, 2 barras, 3 sachês de eletrólito"
- Fase 2: integração com marketplace para compra direta

### 4.3 Registro Retroativo de Suplementação

Para cada atividade completada, o atleta pode registrar o que efetivamente consumiu.

**Formas de registro:**

| Forma | MVP | Fase 2 |
|---|---|---|
| Manual (produto + quantidade + fase) | ✅ | ✅ |
| Presets personalizados do usuário | ✅ | ✅ |
| Foto do produto (OCR + IA) | — | ✅ |
| Texto livre com NLP ("2 géis + 500ml iso") | — | ✅ |

**Dados por item registrado:**
- Nome/Produto, Quantidade/Porções
- Fase: pré / durante / pós
- Carboidratos (g), Sódio (mg), Cafeína (mg), Kcal

**Resumo nutricional por treino:**
- g/h de carboidratos
- mg/h de sódio
- Cafeína total (mg)
- Kcal total

### 4.4 Insights de IA sobre Nutrição

Para cada atividade com registro, a IA gera:
- Comparação entre protocolo prescrito vs. consumo real
- Comparação com recomendações gerais (faixas de carbo, sódio, cafeína)
- Impacto do clima e duração sobre a ingestão
- Alertas de risco: ingestão baixa, excesso de cafeína, sódio insuficiente em dia quente
- Score de confiança da leitura exibido explicitamente
- Qualquer valor sugerido pela IA pode ser editado pelo usuário

---

## 5. Sincronização de Atividades

### 5.1 Integrações Ativas

| Integração | Fase | Função |
|---|---|---|
| **Strava** | MVP | Sincronização de histórico + atividades concluídas |
| **intervals.icu** | MVP | Envio de treinos estruturados + importação via webhook |
| **OpenWeatherMap** | V1.2 | Dados de clima para ajuste nutricional |
| **Garmin Connect** | V3 | Integração nativa premium |
| **TrainingPeaks** | V3 | Planos para treinadores |

### 5.2 Regras de Sincronização

- **Automática:** a cada 2 horas (job agendado)
- **Refresh de tokens:** diário às 6:00 AM para manter conexões ativas
- **Manual:** disponível via botão na interface
- **Deduplicação:** via `external_id` para evitar duplicatas
- **Rate limiting:** respeitando limites da API (Strava: 100 req/15min, 1000/dia)
- **Falha:** retry com backoff exponencial; falha de um provider não afeta outros

### 5.3 Dados Importados por Atividade

- Data/hora, tipo (corrida, bike, natação)
- Duração, distância
- FC média (se disponível)
- Localização inicial (lat/lon) — para consulta de clima histórico
- Dados climáticos enriquecidos via API: temperatura, umidade, vento

### 5.4 Desconexão de Integração

- Usuário pode desconectar qualquer integração a qualquer momento
- Atividades já importadas são mantidas
- Revogação de token no provider (opcional)

---

## 6. Dashboard do Atleta

### 6.1 Visão Semanal
- Treinos planejados vs. realizados
- Volume por modalidade: km nadados, pedalados, corridos
- Carga da semana vs. semana anterior (TSS)
- Contador regressivo para a prova alvo
- % do plano concluído no bloco atual

### 6.2 Histórico e Tendências
- Lista de atividades filtrada por período (7, 30, 90 dias) e modalidade
- Nutrição média por treino (g/h carbo, mg/h sódio, cafeína)
- Tendência de performance (melhora, queda, risco de fadiga)
- Gráfico de consistência de treinos

### 6.3 Alertas Inteligentes

| Trigger | Alerta |
|---|---|
| Overtraining detectado | Sugere dia de descanso extra |
| Hidratação insuficiente relatada | Ajusta plano nutricional |
| 2+ treinos perdidos seguidos | Notificação com novo plano adaptado |
| Fase de Taper chegando | Aviso + orientações de estratégia |
| Integração desconectada | Alerta para reconexão |

---

## 7. UX — Telas Principais

### 7.1 Onboarding (fluxo guiado)
- 5 blocos, uma tela por bloco
- Estimativa automática de FC máxima se não informada
- Conexão Strava e intervals.icu embutidas no último bloco

### 7.2 Dashboard Principal
- Treino de hoje com protocolo nutricional resumido
- Status das integrações (Strava, intervals.icu)
- Contador regressivo para a prova

### 7.3 Treino do Dia
- Treino estruturado completo (aquecimento, blocos, descanso, desaquecimento)
- Timeline de nutrição intra-treino com horários
- Botão "Enviar para o relógio"

### 7.4 Lista de Atividades
- Ícone por modalidade (nado, bike, corrida, triathlon)
- Status de nutrição: prescrita / registrada / sem registro
- Status de execução: acima / dentro / abaixo do plano

### 7.5 Detalhe da Atividade
- Dados do treino (tipo, duração, distância, FC média)
- Dados climáticos (temperatura, umidade, vento)
- Protocolo prescrito vs. consumido real
- Resumo nutricional (g/h carbo, mg/h sódio, cafeína, kcal)
- Insight da IA com score de confiança
- Campo para relatar eventos adversos (GI, câimbras, tontura)

### 7.6 Registro de Suplementação
- Botões: [Manual] / [Preset] / [Foto] (Fase 2) / [Texto] (Fase 2)
- Fases com cores: Pré = azul, Durante = verde, Pós = laranja
- Máximo 2 cliques para lançar suplementação
- Fluxo de foto: fotografa → prévia com nutrientes → confirma ou edita
- Fluxo de texto: digita → parsing em itens → confirma

### 7.7 Insights Gerais
- Lista de treinos com resumo de IA e alertas coloridos
- Filtros por período e tipo de modalidade

### 7.8 Painel do Treinador (Fase 3)
- Lista de alunos com último treino e status (ativo, pendente)
- Perfil consolidado do aluno (resumo, nutrição média, tendência)
- Detalhe do treino do aluno com campo de comentário

---

## 8. Módulo do Treinador (Fase 3)

### 8.1 Perfil de Treinador
- Conta com permissão específica de treinador
- Painel consolidado de múltiplos alunos
- Cada aluno autoriza via convite (e-mail ou código único)

### 8.2 O que o Treinador Vê por Aluno
- Resumo de treinos (últimos 7, 30, 90 dias): volume, distância, tempo total
- Nutrição média por treino (g/h carbo, mg/h sódio, cafeína)
- Tendências de performance (melhora, queda, risco de fadiga)
- Eventos adversos reportados pelo atleta
- Insights de IA (idênticos ao que o atleta vê)

### 8.3 Comentários
- Treinador pode deixar observações vinculadas a treinos específicos
- Visíveis apenas para treinador e atleta
- Treinador **não pode editar** registros do atleta, apenas visualizar e comentar

### 8.4 Privacidade
- Atleta controla quem acessa seus dados (convite + aceitação explícita)
- Atleta pode revogar o acesso do treinador a qualquer momento

---

## 9. Estratégia de Integração

### 9.1 intervals.icu como ponte universal para dispositivos

| Abordagem | Prós | Contras |
|---|---|---|
| Integração direta Garmin | Nativa | Parceria formal, meses de review |
| Strava como ponte | OAuth simples | Não envia treinos estruturados, limitado |
| **intervals.icu (escolhido)** | **Todos os dispositivos, API aberta, OAuth** | **Usuário precisa ter conta** |

### 9.2 Fluxo de Dados

```
Endura → intervals.icu API → Garmin / Wahoo / Coros / Polar
         (envio de treinos estruturados)

Relógio → intervals.icu → Endura webhook
         (atividades concluídas)

Strava → Endura job (a cada 2h)
         (histórico de atividades)

OpenWeatherMap → Endura
         (clima por localização + data do treino)
```

### 9.3 Roadmap de Integrações

| Fase | Integração | Objetivo |
|---|---|---|
| MVP | Strava OAuth | Sync de atividades históricas e novas |
| MVP | intervals.icu OAuth | Envio de treinos para relógio + importação |
| V1.2 | OpenWeatherMap | Ajuste nutricional por temperatura e umidade |
| V2.0 | Strava Webhook | Sync em tempo real sem job agendado |
| V3.0 | Garmin Connect API | Integração nativa premium |
| V3.0 | TrainingPeaks API | Suporte a planos de treinadores |

---

## 10. Segurança e Auditoria

- Tokens de integração criptografados em repouso (AES-256)
- CSRF protection via `state` parameter no OAuth
- Log de todas as requisições para APIs externas com Correlation ID único
- Mascaramento de tokens e códigos de autorização em logs
- Rate limiting respeitando limites das APIs
- Retry com backoff exponencial em falhas de API
- Timestamps automáticos em todas as entidades

---

## 11. Modelo de Negócio

| Plano | Preço | Inclui |
|---|---|---|
| **Free** | R$ 0/mês | Plano genérico de 4 semanas, sem integração com relógio |
| **Pro** | R$ 47/mês | Plano IA personalizado + integração relógio + nutrição intra-treino + registro de suplementação |
| **Elite** | R$ 89/mês | Tudo do Pro + módulo treinador (até 10 alunos) + análise avançada + simulação de prova |

**Projeção:** 200 assinantes Pro = R$ 9.400/mês | Custo de infraestrutura: ~R$ 300–500/mês

---

## 12. Roadmap de Releases

| Versão | Prazo | Entregas principais |
|---|---|---|
| **MVP** | Mês 1–3 | Onboarding + plano IA + envio via intervals.icu + nutrição prescritiva + registro manual de suplementação + sync Strava |
| **V1.1** | Mês 4 | Checkin semanal + adaptação contínua do plano + dashboard planejado vs. realizado |
| **V1.2** | Mês 5 | Lista de compras + ajuste por clima (OpenWeatherMap) + insights IA nutrição + métricas g/h |
| **V2.0** | Mês 7–8 | Registro via foto (OCR) + texto livre (NLP) + histórico nutricional avançado + Strava Webhook |
| **V3.0** | Mês 10–12 | Módulo treinador completo + comentários + painel multi-alunos + Garmin Connect + TrainingPeaks |

**Fora do roadmap (deliberadamente):**
- App nativo iOS/Android (PWA resolve no MVP)
- Coach humano
- Prescrição de nutrição diária (foco em intra-treino)
- Comunidade e rankings (considerado pós V3.0)

---

## 13. Princípios do Produto

**Self-service total**
Onboarding, configuração e suporte sem interação humana. FAQ + vídeo curto resolvem 90% das dúvidas.

**Transparência da IA**
Insights exibem score de confiança. Qualquer valor sugerido pela IA pode ser editado. Insights são sugestões — não substituem orientação profissional ou médica.

**Dados do usuário, não nossos**
Atividades ficam no intervals.icu / Strava. O Endura armazena preferências, plano gerado e registros de suplementação do próprio atleta.

**Privacidade por padrão**
Dados de atletas só acessíveis por treinadores com autorização explícita e revogável.

**Sem integrações frágeis no MVP**
intervals.icu é o único ponto crítico para dispositivos. Quanto menos APIs diretas, menos pontos de falha.

**Plano simples**
Três planos máximo. Menos decisão para o usuário, menos suporte de vendas necessário.

---

*Endura — Documento Mestre de Produto*
*Versão 2.0 | Fevereiro 2026*
