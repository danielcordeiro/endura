import { test, expect } from './fixtures/auth.fixture';
import { NutritionPage } from './pages/nutrition.page';

test.describe('Nutricao - Pagina Principal', () => {
  test('deve carregar a pagina de nutricao', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await expect(nutritionPage.title).toBeVisible();
    await expect(nutritionPage.presetsSection).toBeVisible();
    await expect(nutritionPage.shoppingListSection).toBeVisible();
  });

  test('deve exibir links de navegacao', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await expect(nutritionPage.tendenciasLink).toBeVisible();
    await expect(nutritionPage.raceDayLink).toBeVisible();
  });

  test('deve navegar para tendencias', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await nutritionPage.tendenciasLink.click();
    await expect(page).toHaveURL(/\/nutricao\/tendencias/);
    await expect(page.locator('text=Tendencias Nutricionais')).toBeVisible({ timeout: 5_000 });
  });

  test('deve navegar para race day', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await nutritionPage.raceDayLink.click();
    await expect(page).toHaveURL(/\/nutricao\/race-day/);
    await expect(page.locator('text=Race Day Simulator')).toBeVisible({ timeout: 5_000 });
  });
});
