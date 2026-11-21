import { expect, test } from '@playwright/test';
import {
  ADMIN_PASSWORD,
  apiAvailable,
  apiLogin,
  createCashier,
  listOutlets,
} from './support/api';
import { ADMIN_EMAIL } from './support/api';
import { loginUi, setActiveOutlet, signOutUi } from './support/ui';

test.describe('role-aware navigation', () => {
  test('admin sees manage menu, cashier does not', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const adminToken = await apiLogin(request);
    const outlets = await listOutlets(request, adminToken);
    expect(outlets.length).toBeGreaterThan(0);
    const outlet = outlets[0];
    const cashier = await createCashier(request, adminToken, outlet.id);

    // --- Admin ---
    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setActiveOutlet(page, outlet.id);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Outlet', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Laporan', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Produk', exact: true })).toBeVisible();

    // Reports include the staff commission section.
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Komisi Staf' })).toBeVisible();

    // --- Cashier ---
    await signOutUi(page);
    await loginUi(page, cashier.email, cashier.password);
    await setActiveOutlet(page, outlet.id);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Kasir', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pesanan', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Laporan', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Outlet', exact: true })).toHaveCount(0);

    // Direct URL access is blocked in the UI.
    await page.goto('/reports');
    await expect(page.getByText('Akses dibatasi')).toBeVisible();

    // Manage-only actions are hidden on the products page.
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Produk', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tambah Produk' })).toHaveCount(0);
  });
});
