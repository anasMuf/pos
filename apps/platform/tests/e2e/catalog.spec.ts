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

test.describe('catalog & outlet editing', () => {
  test('capability presets replace previous flags and can be reset', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/outlets/new');

    const preset = page.getByLabel('Preset Capability');
    const checks = page.getByRole('checkbox');

    await preset.selectOption('print');
    await expect(checks.first()).toBeChecked();

    // Switching to a smaller preset must not keep the previous true flags.
    await preset.selectOption('retail');
    const checkCount = await checks.count();
    for (let index = 0; index < checkCount; index += 1) {
      if (index === 0 || index === 3) {
        await expect(checks.nth(index)).toBeChecked();
      } else {
        await expect(checks.nth(index)).not.toBeChecked();
      }
    }

    // Clearing the select and the Reset button both clear every flag.
    await preset.selectOption('');
    for (let index = 0; index < checkCount; index += 1) {
      await expect(checks.nth(index)).not.toBeChecked();
    }

    await preset.selectOption('print');
    await expect(checks.first()).toBeChecked();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    for (let index = 0; index < checkCount; index += 1) {
      await expect(checks.nth(index)).not.toBeChecked();
    }
  });

  test('admin edits a product, its variant, and outlet info', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const token = await apiLogin(request);
    const auth = { Authorization: `Bearer ${token}` };
    const outlets = await listOutlets(request, token);
    expect(outlets.length).toBeGreaterThan(0);
    const outlet = outlets[0];

    const stamp = Date.now();
    const productName = `E2E Product ${stamp}`;
    const variantName = `E2E Variant ${stamp}`;

    const created = await request.post(`${API_URL}/products`, {
      headers: auth,
      data: {
        outlet_id: outlet.id,
        name: productName,
        sku: `E2E-${stamp}`,
        category: 'E2E',
        pricing_type: 'fixed',
        base_price: 10000,
        track_inventory: true,
        stock_qty: 10,
        min_stock_qty: 1,
      },
    });
    expect(created.status(), 'create product').toBe(201);
    const product = (await created.json()).data as { id: number };

    const variant = await request.post(`${API_URL}/products/${product.id}/variants`, {
      headers: auth,
      data: { name: variantName, sku: `E2E-V-${stamp}`, stock_qty: 3 },
    });
    expect(variant.status(), 'create variant').toBe(201);

    try {
      await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await setActiveOutlet(page, outlet.id);
      await page.reload();

      // --- Edit product ---
      await page.goto('/products');
      const productRow = page.getByRole('row').filter({ hasText: productName });
      await expect(productRow).toBeVisible();
      await productRow.getByRole('link', { name: 'Edit produk' }).click();
      await page.getByLabel('Harga Dasar').fill('12345');
      await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
      await expect(page.getByText('Produk diperbarui')).toBeVisible();

      // --- Edit then delete variant ---
      await productRow.getByRole('link', { name: 'Varian' }).click();
      await expect(page.getByRole('heading', { name: `Varian · ${productName}` })).toBeVisible();

      const variantRow = page.getByRole('row').filter({ hasText: variantName });
      await variantRow.getByRole('link', { name: 'Edit varian' }).click();
      // Variant stock is read-only on edit; changes must go through a stock movement.
      await expect(page.getByRole('link', { name: 'Catat mutasi stok' })).toBeVisible();
      const editedName = `${variantName} edited`;
      await page.getByLabel('Nama', { exact: true }).fill(editedName);
      await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
      await expect(page.getByText('Varian diperbarui')).toBeVisible();

      const deleteButton = page
        .getByRole('row')
        .filter({ hasText: editedName })
        .getByRole('button', { name: 'Hapus varian' });
      await deleteButton.click();
      await expect(page.getByRole('dialog').getByRole('heading', { name: 'Hapus varian' })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click();
      await expect(page.getByText('Varian dihapus')).toBeVisible();

      // --- Edit outlet info ---
      await page.goto(`/outlets/${outlet.id}/edit`);
      await expect(page.getByRole('heading', { name: `Edit Outlet · ${outlet.name}` })).toBeVisible();
      await page.getByLabel('Alamat').fill(`${outlet.address} (E2E)`);
      await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
      await expect(page.getByText('Outlet diperbarui')).toBeVisible();
    } finally {
      await request.patch(`${API_URL}/outlets/${outlet.id}`, {
        headers: auth,
        data: { address: outlet.address },
      });
      await request.delete(`${API_URL}/products/${product.id}`, { headers: auth });
    }
  });
});
