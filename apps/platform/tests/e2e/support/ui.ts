import { expect, type Page } from '@playwright/test';

export async function loginUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** Clears the session and returns to the login screen. */
export async function signOutUi(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
}

export async function setActiveOutlet(page: Page, outletId: number): Promise<void> {
  await page.evaluate((id) => {
    localStorage.setItem('pos_active_outlet_id', String(id));
  }, outletId);
}
