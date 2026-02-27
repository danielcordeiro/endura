import { test as base, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@endura.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Test@123456';

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
