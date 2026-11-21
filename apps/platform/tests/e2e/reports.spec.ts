import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, apiAvailable } from './support/api';
import { loginUi } from './support/ui';

test.describe('reports filters', () => {
  test('rejects an inverted date range', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Laporan', exact: true })).toBeVisible();

    await page.getByLabel('Dari').fill('2026-12-31');
    await page.getByLabel('Sampai').fill('2026-01-01');

    await expect(
      page.getByText('Tanggal "Dari" tidak boleh melewati tanggal "Sampai".'),
    ).toBeVisible();
    await expect(page.getByText('Rentang tanggal tidak valid')).toBeVisible();

    await page.getByLabel('Sampai').fill('2026-12-31');
    await expect(page.getByText('Rentang tanggal tidak valid')).toHaveCount(0);
  });
});
