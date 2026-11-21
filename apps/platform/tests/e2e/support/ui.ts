import { expect, type Page } from '@playwright/test';

export async function loginUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Kata sandi', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** Clears the session and returns to the login screen. */
export async function signOutUi(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun Anda' })).toBeVisible();
}

export async function setActiveOutlet(page: Page, outletId: number): Promise<void> {
  await page.evaluate((id) => {
    localStorage.setItem('pos_active_outlet_id', String(id));
  }, outletId);
}
