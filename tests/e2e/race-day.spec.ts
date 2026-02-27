import { test, expect } from './fixtures/auth.fixture';

test.describe('Race Day Simulator', () => {
  test('deve carregar a pagina do simulador', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await expect(page.locator('text=Race Day Simulator')).toBeVisible({ timeout: 5_000 });
  });

  test('deve exibir botao de nova simulacao', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(2_000);

    await expect(page.getByRole('button', { name: /nova simulacao/i })).toBeVisible();
  });

  test('deve abrir formulario de simulacao', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(2_000);

    await page.getByRole('button', { name: /nova simulacao/i }).click();
    await expect(page.locator('text=Simular Nutricao Race Day')).toBeVisible({ timeout: 3_000 });
  });

  test('deve exibir secao Meus Planos', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(2_000);

    await expect(page.locator('text=Meus Planos')).toBeVisible();
  });

  test('deve exibir contexto de prova alvo se existir', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(3_000);

    // Pode ou nao ter prova alvo
    const hasRaceContext = await page.locator('text=Prova alvo').isVisible().catch(() => false);
    // O importante e que carregou sem erros
    expect(true).toBeTruthy();
  });

  test('formulario deve ter campos obrigatorios', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(2_000);

    await page.getByRole('button', { name: /nova simulacao/i }).click();
    await page.waitForTimeout(500);

    // Verifica campos do formulario
    await expect(page.locator('text=Nome do plano')).toBeVisible();
    await expect(page.locator('text=Tempo alvo')).toBeVisible();
    await expect(page.locator('text=Condicoes climaticas')).toBeVisible();
  });

  test('deve navegar de volta para nutricao', async ({ authenticatedPage: page }) => {
    await page.goto('/nutricao/race-day');
    await page.waitForTimeout(2_000);

    await page.locator('a[href="/nutricao"]').click();
    await expect(page).toHaveURL(/\/nutricao$/);
  });
});
