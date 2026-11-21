import { expect, test } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API_URL,
  apiAvailable,
  apiLogin,
  listOutlets,
} from './support/api';
import { loginUi, setActiveOutlet } from './support/ui';

test.describe('dedicated form pages', () => {
  test('add/edit forms are reachable as their own pages', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const token = await apiLogin(request);
    const outlets = await listOutlets(request, token);
    expect(outlets.length).toBeGreaterThan(0);
    const outlet = outlets[0];

    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setActiveOutlet(page, outlet.id);
    await page.reload();

    await page.goto('/products/new');
    await expect(page.getByRole('heading', { name: 'Produk Baru' })).toBeVisible();

    await page.goto('/customers/new');
    await expect(page.getByRole('heading', { name: 'Pelanggan Baru' })).toBeVisible();

    await page.goto('/inventory/new');
    await expect(page.getByRole('heading', { name: 'Catat Mutasi Stok' })).toBeVisible();

    await page.goto('/shifts/new');
    await expect(page.getByRole('heading', { name: 'Buka Shift' })).toBeVisible();

    await page.goto(`/outlets/${outlet.id}/edit`);
    await expect(page.getByRole('heading', { name: `Edit Outlet · ${outlet.name}` })).toBeVisible();

    await page.goto(`/outlets/${outlet.id}/capabilities`);
    await expect(page.getByRole('heading', { name: `Capability · ${outlet.name}` })).toBeVisible();

    await page.goto(`/outlets/${outlet.id}/receipt-settings`);
    await expect(
      page.getByRole('heading', { name: `Pengaturan Struk · ${outlet.name}` }),
    ).toBeVisible();

    await page.goto(`/outlets/${outlet.id}/members/new`);
    await expect(page.getByRole('heading', { name: 'Tambah Anggota Outlet' })).toBeVisible();

    await page.goto('/tenants');
    await expect(page.getByRole('heading', { name: 'Tenant', exact: true })).toBeVisible();
    await page.goto('/tenants/new');
    await expect(page.getByRole('heading', { name: 'Tenant Baru' })).toBeVisible();
    const tenantResponse = await request.get(`${API_URL}/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tenants = (await tenantResponse.json()).data as { id: number; name: string }[];
    if (tenants.length > 0) {
      await page.goto(`/tenants/${tenants[0].id}/edit`);
      await expect(
        page.getByRole('heading', { name: `Edit Tenant · ${tenants[0].name}` }),
      ).toBeVisible();
    }

    // Missing entities show a clear error state instead of an empty form.
    await page.goto('/products/999999/edit');
    await expect(page.getByRole('heading', { name: 'Produk tidak ditemukan' })).toBeVisible();
    await page.goto('/customers/999999/edit');
    await expect(page.getByRole('heading', { name: 'Pelanggan tidak ditemukan' })).toBeVisible();

    const ordersResponse = await request.get(`${API_URL}/orders?outlet_id=${outlet.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = (await ordersResponse.json()).data as { id: number; order_number: string }[];
    if (orders.length > 0) {
      const order = orders[0];
      await page.goto(`/orders/${order.id}/payment`);
      await expect(
        page.getByRole('heading', { name: `Pembayaran ${order.order_number}` }),
      ).toBeVisible();
    }
  });
});
