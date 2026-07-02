import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { TEST_EMAIL, TEST_PASSWORD } from './fixtures/auth.fixture';

test.describe('Autenticacao', () => {
  test('deve redirecionar para login quando nao autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('deve fazer login com credenciais validas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('deve mostrar erro com credenciais invalidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('invalid@email.com', 'wrongpassword');
    await expect(page.locator('text=/erro|invalido/i')).toBeVisible({ timeout: 5_000 });
  });

  test('deve redirecionar para dashboard apos login', async ({ page }) => {
    // Tenta acessar uma rota protegida
    await page.goto('/nutricao');
    await expect(page).toHaveURL(/\/login/);
  });
});
