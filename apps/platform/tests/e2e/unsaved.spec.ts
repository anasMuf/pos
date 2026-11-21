import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, apiAvailable, apiLogin, listOutlets } from './support/api';
import { loginUi, setActiveOutlet } from './support/ui';

test.describe('unsaved changes guard', () => {
  test('asks before leaving a dirty form', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const token = await apiLogin(request);
    const outlets = await listOutlets(request, token);
    test.skip(outlets.length === 0, 'No outlet available.');
    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setActiveOutlet(page, outlets[0].id);
    await page.reload();

    await page.goto('/customers/new');
    await page.getByLabel('Nama', { exact: true }).fill('Pelanggan Belum Disimpan');

    await page.getByRole('link', { name: 'Kembali' }).click();
    await expect(page.getByRole('dialog', { name: 'Perubahan belum disimpan' })).toBeVisible();

    // Staying keeps the form state (and the URL).
    await page.getByRole('button', { name: 'Tetap di halaman' }).click();
    await expect(page).toHaveURL(/\/customers\/new$/);
    await expect(page.getByLabel('Nama', { exact: true })).toHaveValue('Pelanggan Belum Disimpan');

    // Leaving discards it.
    await page.getByRole('link', { name: 'Kembali' }).click();
    await page.getByRole('button', { name: 'Tinggalkan' }).click();
    await expect(page).toHaveURL(/\/customers$/);
  });
});
