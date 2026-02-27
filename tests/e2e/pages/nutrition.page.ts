import type { Page, Locator } from '@playwright/test';

export class NutritionPage {
  readonly title: Locator;
  readonly presetsSection: Locator;
  readonly shoppingListSection: Locator;
  readonly createPresetBtn: Locator;
  readonly tendenciasLink: Locator;
  readonly raceDayLink: Locator;

  constructor(private page: Page) {
    this.title = page.locator('h1', { hasText: 'Nutricao' });
    this.presetsSection = page.locator('text=Meus Presets');
    this.shoppingListSection = page.locator('text=Lista de Compras');
    this.createPresetBtn = page.getByRole('button', { name: /criar preset/i });
    this.tendenciasLink = page.locator('a', { hasText: 'Tendencias' });
    this.raceDayLink = page.locator('a', { hasText: 'Race Day' });
  }

  async goto() {
    await this.page.goto('/nutricao');
  }

  async waitForLoad() {
    await this.page.waitForSelector('h1', { timeout: 10_000 });
  }
}
