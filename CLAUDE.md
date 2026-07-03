# endura — contexto para Claude

Monorepo pnpm (`apps/web`, `apps/api`).

## Deploy
- TODO push que dispara deploy → bump em `apps/web/lib/version.ts` (regra explícita do Daniel:
  "é bom você sempre incrementar a versão pra eu saber se subiu").
- **1 push por deploy** — pushes em sequência CANCELAM o build do Render (o anterior é abortado).
- Verificar se o deploy subiu pela versão exposta no bundle/app (comparar com o que está em
  `apps/web/lib/version.ts` antes do push).

## Banco
- `DATABASE_URL` = Supabase de **PRODUÇÃO** — não existe banco local separado para dev.
- Drizzle: rodar de `apps/api` e **inspecionar o SQL gerado** antes de aplicar — já houve drift de
  snapshot que gerou `CREATE TABLE` de uma tabela que já existia (2x).

## Ambiente local
- Servidor não sobe local de forma confiável (conflito undici × Node 20.19) — para testar a API,
  usar `app.inject()` em vez de subir o servidor HTTP.
- pnpm: usar a versão 9 via `npx` (o pnpm 10 global da máquina não é o esperado pelo projeto).
- PWA: o service worker cacheia o shell — se algo parecer desatualizado no browser do Daniel, ele
  pode estar vendo uma build antiga (hard refresh / limpar cache antes de investigar "bug").

## Segurança
- **NUNCA** escrever PII ou segredos em docs do repo — o repo é **público** (já houve purge de
  histórico do git em 2026-07-02 por causa disso).
