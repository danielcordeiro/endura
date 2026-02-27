# Guia de Testes E2E com Playwright

## Setup

Playwright esta configurado na raiz do monorepo com viewport mobile-first (375x812).

### Executar testes
```bash
pnpm test:e2e          # Roda todos os testes em headless
pnpm test:e2e:ui       # Abre UI do Playwright para debug
```

### Configuracao
- `playwright.config.ts` - Config principal
- Viewport: 375x812 (mobile-first, Pixel 5)
- Browser: Chromium
- webServer: inicia API (8080) e Web (3000) automaticamente

### Variaveis de ambiente
```
TEST_EMAIL=user@email.com
TEST_PASSWORD=password123
```

## Estrutura

```
tests/e2e/
  fixtures/
    auth.fixture.ts       # Fixture de autenticacao
  pages/
    login.page.ts         # Page Object - Login
    dashboard.page.ts     # Page Object - Dashboard
    activity-detail.page.ts # Page Object - Atividade
    nutrition.page.ts     # Page Object - Nutricao
  auth.spec.ts            # Testes de autenticacao
  dashboard.spec.ts       # Testes do dashboard
  nutrition-log.spec.ts   # Testes de navegacao nutricao
  nutrition-presets.spec.ts # Testes de CRUD presets
  nutrition-planner.spec.ts # Testes do planner diario
  nutrition-analysis.spec.ts # Testes da analise IA
  race-day.spec.ts        # Testes do simulador race day
```

## Padrao Page Object

Cada pagina tem uma classe dedicada com locators e acoes:

```typescript
export class DashboardPage {
  readonly greeting: Locator;
  constructor(private page: Page) {
    this.greeting = page.locator('h1').first();
  }
  async goto() { await this.page.goto('/dashboard'); }
}
```

## Fixture de Autenticacao

Use `authenticatedPage` para testes que requerem login:

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('meu teste', async ({ authenticatedPage: page }) => {
  // ja logado, pode navegar
});
```
