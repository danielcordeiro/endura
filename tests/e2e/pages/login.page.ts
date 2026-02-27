import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder(/email/i).fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder(/senha/i).fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: /entrar/i }).click();
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
