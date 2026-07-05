# Prompt de delegação — implementar o plano de evolução UI/Design

> Copiar tudo abaixo da linha e colar no modelo/agente executor, com o repo
> `C:\Users\danie\git\dgc\endura` como diretório de trabalho.

---

Você vai implementar o plano de evolução de UI/design do app Endura (monorepo pnpm; o trabalho é
100% em `apps/web` — Next.js + Tailwind v4 CSS-first, sem `tailwind.config`).

## Fonte de verdade

Leia INTEIRO, antes de qualquer edição, o arquivo:

`docs/plans/2026-07-05-evolucao-ui-design.md`

Ele contém o diagnóstico com evidências `arquivo:linha` (11 variantes de input, 11 receitas de
card, ~885 linhas de cor crua, hex fora de token), a paleta v2, as regras de uso de cor (§3.3),
as fases de execução (§4) e os critérios de aceite (§5). Este prompt não substitui o plano —
só define como executá-lo. Em conflito entre os dois, vale o plano.

## Escopo e ordem

- Execute as **Fases 0, 1, 2 e 3**, nessa ordem. A Fase 4 (polish) fica FORA do escopo — não faça.
- Na Fase 3, use a **Opção A** da paleta (§3.1 — evoluir o azul). Não implemente a Opção B.
- **Uma fase por vez, com checkpoint:** ao terminar cada fase — commit + push + bump — PARE,
  reporte o que mudou (com screenshots antes/depois) e aguarde meu OK para a próxima fase.
  Motivo prático: cada push dispara deploy no Render e pushes em sequência CANCELAM o build
  anterior; além disso quero validar o visual fase a fase.
- Não mude NADA fora de `apps/web` (nem API, nem migrations, nem docs além dos citados no plano).
- Não refatore lógica/comportamento: este trabalho é visual/estrutural de UI. Se um fix visual
  parecer exigir mudança de lógica, pare e me pergunte.

## Regras duras do repo (violar = retrabalho ou build quebrado)

1. **pnpm:** SEMPRE `npx pnpm@9 ...`. O pnpm 10 global da máquina quebra o repo e o
   `--frozen-lockfile` do Render. Não rode `pnpm install` sem necessidade; se precisar, avise antes.
2. **Deploy:** todo push exige bump em `apps/web/lib/version.ts` (versão atual: 1.1.2 — bump de
   patch por fase). **1 push por fase, nunca dois pushes seguidos.** Depois do push, confirme que
   o deploy subiu comparando a versão exposta no app com a do arquivo.
3. **Servidor local não sobe** (conflito undici × Node 20.19). Valide com
   `npx pnpm@9 --filter web build` (confira o nome exato do script no package.json) e screenshots
   via Playwright (setup de e2e existe; exige `TEST_EMAIL`/`TEST_PASSWORD` no ambiente — nunca
   hardcodar credenciais).
4. **PWA:** o service worker cacheia o shell — ao validar no browser, hard refresh antes de
   concluir que algo "não mudou".
5. **Repo PÚBLICO:** nenhum dado pessoal ou segredo em código, commit ou doc.
6. **Git:** stage seletivo (nunca `git add -A`); mensagem de commit em arquivo temporário
   (`git commit -F <arquivo>`); commits em português no padrão `feat(ui):`/`fix(ui):`.

## Método de trabalho por fase

1. Releia a seção da fase no plano e liste os arquivos que vai tocar.
2. Tire screenshots "antes" das 8 telas principais (dashboard, treino, treino/[id], atividades,
   atividades/[id], nutrição, configurações, login).
3. Implemente. Para migrações de cor "same-hex" (token tem o mesmo hex da cor crua), o resultado
   deve ser **no-op visual** — se o screenshot-diff acusar mudança não intencional, pare e
   investigue antes de seguir.
4. `build` + screenshots "depois" + e2e disponíveis.
5. Commit + bump de versão + push único. Confirme o deploy. Reporte e aguarde OK.

## Critérios de aceite (resumo — detalhes no §5 do plano)

- Build sem warnings novos; e2e passando.
- Fase 1: nenhuma variante de input fora do sistema novo (exceção documentada:
  product-autocomplete); nenhum input/botão com alvo < 44px.
- Fase 2: uma única receita de card; ritmo `py-6 space-y-8` em todas as telas; H1 e títulos de
  card padronizados.
- Fase 3: grep de cores cruas (`(text|bg|border|ring|from|to|via)-(slate|gray|zinc|blue|emerald|rose|amber|red|green|cyan|orange|purple|yellow|sky)-[0-9]`)
  em `apps/web/app` e `apps/web/components` ≈ 0; zero hex em className; charts consumindo só
  `lib/chart-theme.ts`.
- Nunca introduza cor crua ou hex novo em className; todo valor novo vira token no `@theme` de
  `apps/web/app/globals.css`.

## Armadilhas conhecidas (já verificadas — não "re-descobrir")

- `duration-800` é VÁLIDO no Tailwind v4 (gera `transition-duration:.8s`) — não é bug, não mexa.
- `cn()` usa `twMerge`: `className` passado a `<Button>` sobrescreve a base deterministicamente.
  Os `h-14`/`h-10` nos callers são dívida de API (resolver com a prop `size` da Fase 1), não bug.
- Não existem template literals interpolando cor em className — não perca tempo procurando.
- Os gradientes `from-[#2c353d]`/`to-[#1c242c]` dos cards de treino são INTENCIONAIS — promova a
  token (`card-gradient-hi/lo`), não remova.
- Os acentos dos cards do dashboard (azul=CTL, rose=ATL, emerald=positivo) são um sistema coerente
  — migre para os tokens `metric-*` da paleta v2 (§3.1), NÃO para os semânticos
  success/warning/danger.

Comece agora: leia o plano, confirme em uma frase o escopo que entendeu e execute a Fase 0.
