import { test, expect } from './fixtures/auth.fixture';
import { NutritionPage } from './pages/nutrition.page';

test.describe('Nutricao - Presets', () => {
  test('deve abrir sheet de criar preset', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await nutritionPage.createPresetBtn.click();
    await expect(page.locator('text=Criar preset').last()).toBeVisible();
    await expect(page.getByPlaceholder(/treino longo/i)).toBeVisible();
  });

  test('deve criar um preset com sucesso', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    await nutritionPage.createPresetBtn.click();

    // Preenche nome
    await page.getByPlaceholder(/treino longo/i).fill('Preset E2E Test');

    // Preenche primeiro item
    await page.getByPlaceholder('Produto').first().fill('Gel de carboidrato');
    await page.getByPlaceholder(/quantidade/i).first().fill('2 unidades');

    // Salva
    await page.getByRole('button', { name: /salvar/i }).click();

    // Verifica que aparece na lista
    await expect(page.locator('text=Preset E2E Test')).toBeVisible({ timeout: 5_000 });
  });

  test('deve deletar um preset', async ({ authenticatedPage: page }) => {
    const nutritionPage = new NutritionPage(page);
    await nutritionPage.goto();
    await nutritionPage.waitForLoad();

    // Verifica se existe um preset e tenta deletar
    const deleteBtn = page.locator('button').filter({ has: page.locator('text=delete') }).first();
    const isVisible = await deleteBtn.isVisible().catch(() => false);

    if (isVisible) {
      const presetCount = await page.locator('[class*="rounded-2xl"]').filter({ hasText: /item|itens/ }).count();
      await deleteBtn.click();

      // Aguarda a lista atualizar
      await page.waitForTimeout(1_000);
      const newCount = await page.locator('[class*="rounded-2xl"]').filter({ hasText: /item|itens/ }).count();
      expect(newCount).toBeLessThan(presetCount);
    }
  });
});
