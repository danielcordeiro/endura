import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Dashboard', () => {
  test('deve carregar o dashboard com saudacao', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Verifica saudacao (Bom dia, Boa tarde ou Boa noite)
    await expect(dashboard.greeting).toContainText(/Bom dia|Boa tarde|Boa noite/);
  });

  test('deve exibir secao SEMANA ATUAL com stats', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    await expect(dashboard.statsGrid).toBeVisible();
    await expect(page.locator('text=Calorias')).toBeVisible();
    await expect(page.locator('text=Treinos')).toBeVisible();
    await expect(page.locator('text=Volume')).toBeVisible();
    await expect(page.locator('text=Consistencia')).toBeVisible();
  });

  test('deve exibir treino do dia ou dia de descanso', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Deve mostrar um dos dois estados
    const hasTodayWorkout = await page.locator('text=TREINO DE HOJE').isVisible();
    const hasRestDay = await page.locator('text=Dia de descanso').isVisible();
    expect(hasTodayWorkout || hasRestDay).toBeTruthy();
  });

  test('deve exibir card de nutricao quando ha treino do dia', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    const hasTodayWorkout = await page.locator('text=TREINO DE HOJE').isVisible();
    if (hasTodayWorkout) {
      // Card de nutricao deve ser visivel
      await expect(dashboard.nutritionCard).toBeVisible({ timeout: 5_000 });
    }
  });

  test('nao deve ter scroll horizontal em viewport mobile', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
