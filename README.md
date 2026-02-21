# Endura

Plataforma de performance para triatletas — planejamento e documentação de produto.

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **PostgreSQL** (Supabase ou local)

## Setup Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/api/.env        # editar com suas credenciais
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/web/.env.local

# 3. Gerar chaves JWT (RS256)
openssl genrsa -out /tmp/private.pem 2048
openssl rsa -in /tmp/private.pem -pubout -out /tmp/public.pem
# Copiar conteúdo para JWT_PRIVATE_KEY e JWT_PUBLIC_KEY no .env
# (usar \n no lugar de quebras de linha)

# 4. Gerar chave de criptografia (AES-256)
openssl rand -hex 32
# Copiar para ENCRYPTION_KEY no .env

# 5. Criar tabelas no banco
pnpm --filter @endura/api db:generate
pnpm --filter @endura/api db:migrate

# 6. Rodar tudo (API + Web)
pnpm dev
```

### Rodando separadamente

```bash
# API (porta 8080)
pnpm dev:api

# Web (porta 3000)
pnpm dev:web

# Drizzle Studio (visualizar banco)
pnpm --filter @endura/api db:studio
```

### Variáveis de ambiente

| Variável | Obrigatória | Onde |
|---|---|---|
| `DATABASE_URL` | Sim | `apps/api/.env` |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Sim | `apps/api/.env` |
| `ENCRYPTION_KEY` | Sim | `apps/api/.env` |
| `ANTHROPIC_API_KEY` | Não* | `apps/api/.env` |
| `STRAVA_CLIENT_ID` / `SECRET` | Não* | `apps/api/.env` |
| `INTERVALS_CLIENT_ID` / `SECRET` | Não* | `apps/api/.env` |
| `NEXT_PUBLIC_API_URL` | Sim | `apps/web/.env.local` |

*\*O servidor roda sem essas chaves, mas as features correspondentes (IA, Strava, intervals.icu) ficam indisponíveis.*

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15, Tailwind CSS 4, Zustand 5, TanStack Query 5 |
| Backend | Fastify 5, Drizzle ORM, Zod, node-cron |
| Banco | Supabase (PostgreSQL) |
| IA | Claude API (Anthropic) |
| Monorepo | pnpm workspaces |

## Documentação

- [Documento Mestre de Produto (MVP v2.0)](docs/Endura_MVP.md) — visão, roadmap e especificações completas

### Detalhes por fase

| Documento | Descrição |
|---|---|
| [Regras de Negócio — Fase 1](docs/projeto/regras_negocio.md) | MVP: sincronização e registro de suplementação |
| [Regras de Negócio — Fase 2](docs/projeto/regras_negocio_fase2.md) | IA: OCR, NLP e insights |
| [Regras de Negócio — Fase 3](docs/projeto/regras_negocio_fase3.md) | Módulo treinador |
| [Integração — Fase 1](docs/projeto/integracao.md) | Strava OAuth e fluxo de dados |
| [Integração — Fase 2](docs/projeto/integracao_fase2.md) | OCR, NLP e clima histórico |
| [Integração — Fase 3](docs/projeto/integracao_fase3.md) | Permissões treinador-atleta |
| [Layout/UX — Fase 1](docs/projeto/layout_frontend.md) | Telas do MVP |
| [Layout/UX — Fase 2](docs/projeto/layout_frontend_fase2.md) | Telas com IA |
| [Layout/UX — Fase 3](docs/projeto/layout_frontend_fase3.md) | Telas do treinador |
