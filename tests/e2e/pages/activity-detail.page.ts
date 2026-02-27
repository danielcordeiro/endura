import type { Page, Locator } from '@playwright/test';

export class ActivityDetailPage {
  readonly title: Locator;
  readonly nutritionSection: Locator;
  readonly followExactlyBtn: Locator;
  readonly logDifferencesBtn: Locator;
  readonly analyzeBtn: Locator;
  readonly comparisonSection: Locator;

  constructor(private page: Page) {
    this.title = page.locator('text=Detalhes da Atividade');
    this.nutritionSection = page.locator('text=Suplementacao');
    this.followExactlyBtn = page.getByRole('button', { name: /segui exatamente/i });
    this.logDifferencesBtn = page.getByRole('button', { name: /registrar diferencas/i });
    this.analyzeBtn = page.getByRole('button', { name: /analisar com ia/i });
    this.comparisonSection = page.locator('text=Prescrito vs Consumido');
  }

  async goto(activityId: string) {
    await this.page.goto(`/atividades/${activityId}`);
  }

  async waitForLoad() {
    await this.page.waitForSelector('text=Detalhes da Atividade', { timeout: 10_000 });
  }

  async addSupplement() {
    await this.page.getByRole('button', { name: /adicionar consumo/i }).click();
  }
}
