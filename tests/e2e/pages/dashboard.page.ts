import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly greeting: Locator;
  readonly raceCountdown: Locator;
  readonly todayWorkout: Locator;
  readonly nutritionCard: Locator;
  readonly statsGrid: Locator;

  constructor(private page: Page) {
    this.greeting = page.locator('h1').first();
    this.raceCountdown = page.locator('text=DIAS');
    this.todayWorkout = page.locator('text=TREINO DE HOJE');
    this.nutritionCard = page.locator('text=Nutricao do Dia');
    this.statsGrid = page.locator('text=SEMANA ATUAL');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForLoad() {
    await this.page.waitForSelector('h1', { timeout: 10_000 });
  }

  async acceptNutritionPlan() {
    await this.page.getByRole('button', { name: /aceitar plano/i }).click();
  }

  async generateNutrition() {
    await this.page.getByRole('button', { name: /gerar nutricao/i }).click();
  }
}
