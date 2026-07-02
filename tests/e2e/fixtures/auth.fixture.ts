import { test as base, type Page } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var e obrigatoria para rodar os testes e2e`);
  return value;
}

export const TEST_EMAIL = requireEnv('TEST_EMAIL');
export const TEST_PASSWORD = requireEnv('TEST_PASSWORD');

interface AuthFixtures {
  authenticatedPage: Page;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
  await page.getByPlaceholder(/senha/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
