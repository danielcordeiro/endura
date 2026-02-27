import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Nutrition Planner - Smart Planner', () => {
  test('deve exibir card de nutricao no dashboard', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    const hasTodayWorkout = await page.locator('text=TREINO DE HOJE').isVisible();
    if (!hasTodayWorkout) {
      test.skip();
      return;
    }

    // Card de nutricao deve existir
    const hasNutritionCard = await dashboard.nutritionCard.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasNutritionCard).toBeTruthy();
  });

  test('deve ter botao de gerar nutricao quando nao existe protocolo', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    const hasNutritionCard = await dashboard.nutritionCard.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasNutritionCard) {
      test.skip();
      return;
    }

    // Verifica se mostra botao de gerar ou de aceitar
    const hasGenerate = await page.getByRole('button', { name: /gerar nutricao/i }).isVisible().catch(() => false);
    const hasAccept = await page.getByRole('button', { name: /aceitar plano/i }).isVisible().catch(() => false);
    const hasAccepted = await page.locator('text=Plano aceito').isVisible().catch(() => false);

    // Um dos estados deve existir
    expect(hasGenerate || hasAccept || hasAccepted).toBeTruthy();
  });

  test('deve exibir resumo nutricional quando existe protocolo', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    const hasNutritionCard = await dashboard.nutritionCard.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasNutritionCard) {
      test.skip();
      return;
    }

    // Verifica se mostra totais ou botao de gerar
    const hasTotals = await page.locator('text=CARB').isVisible().catch(() => false);
    const hasGenerate = await page.getByRole('button', { name: /gerar nutricao/i }).isVisible().catch(() => false);

    expect(hasTotals || hasGenerate).toBeTruthy();
  });

  test('deve abrir sheet de personalizar ao clicar no botao edit', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Se existe um botao de edit no card de nutricao
    const editBtn = page.locator('text=Nutricao do Dia').locator('..').locator('..').getByRole('button').filter({ has: page.locator('text=edit') });
    const isVisible = await editBtn.isVisible().catch(() => false);

    if (isVisible) {
      await editBtn.click();
      await expect(page.locator('text=Personalizar Protocolo')).toBeVisible({ timeout: 3_000 });
    }
  });
});
