import { expect, test } from '@playwright/test';
import {
  ADMIN_PASSWORD,
  apiAvailable,
  apiLogin,
  createOutletMember,
  listOutlets,
  listProducts,
} from './support/api';
import { ADMIN_EMAIL } from './support/api';
import { loginUi, setActiveOutlet, signOutUi } from './support/ui';

const round2 = (value: number) => Math.round(value * 100) / 100;

test.describe('cashier checkout', () => {
  test('applies server-computed discount and tax', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const adminToken = await apiLogin(request);
    const outlets = await listOutlets(request, adminToken);
    expect(outlets.length).toBeGreaterThan(0);
    const outlet = outlets[0];

    const products = await listProducts(request, adminToken, outlet.id);
    const product = products.find((item) => item.pricing_type !== 'dimension');
    test.skip(!product, 'No non-dimension product available on the first outlet.');

    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setActiveOutlet(page, outlet.id);
    await page.reload();

    await page.goto('/pos');
    await expect(page.getByRole('heading', { name: 'Kasir' })).toBeVisible();

    // Add the first usable product to the cart.
    await page
      .getByRole('button')
      .filter({ hasText: product!.name })
      .first()
      .click();
    await page.getByRole('button', { name: 'Tambah', exact: true }).click();
    await expect(page.getByText('Keranjang masih kosong.')).toHaveCount(0);

    // Discount 10% and tax 11% are applied by the server.
    await page.getByLabel('Diskon %').fill('10');
    await page.getByLabel('Pajak %').fill('11');
    // Cash payment requires the tendered amount; change is computed client-side.
    await page.getByLabel('Uang diterima').fill('1000000');

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/orders') && res.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Bayar & Simpan' }).click(),
    ]);

    expect(response.status(), 'POST /orders').toBe(201);
    const body = await response.json();
    const order = body.data;

    const expectedDiscount = round2(order.subtotal_amount * 0.1);
    const expectedTaxable = round2(order.subtotal_amount - expectedDiscount);
    const expectedTax = round2(expectedTaxable * 0.11);
    const expectedTotal = round2(expectedTaxable + expectedTax);

    expect(order.discount_percent).toBe(10);
    expect(order.tax_percent).toBe(11);
    expect(order.discount_amount).toBeCloseTo(expectedDiscount, 2);
    expect(order.tax_amount).toBeCloseTo(expectedTax, 2);
    expect(order.total_amount).toBeCloseTo(expectedTotal, 2);
    expect(order.payment_status).toBe('paid');

    await expect(page.getByText('Transaksi berhasil')).toBeVisible();

    // The order shows up on the orders page.
    await page.goto('/orders');
    await expect(page.getByText(order.order_number)).toBeVisible();

    // Production operators can move orders forward, but cannot open the cashier.
    const operator = await createOutletMember(request, adminToken, outlet.id, 'operator');
    await signOutUi(page);
    await loginUi(page, operator.email, operator.password);
    await setActiveOutlet(page, outlet.id);
    await page.reload();

    await expect(page.getByRole('link', { name: 'Kasir', exact: true })).toHaveCount(0);
    await page.goto('/orders');
    await expect(page.getByText(order.order_number)).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Ubah status pengerjaan' }).first(),
    ).toBeEnabled();
  });

  test('adds a customer without leaving the cashier', async ({ page, request }) => {
    test.skip(!(await apiAvailable(request)), 'API is not reachable; start the backend first.');

    const adminToken = await apiLogin(request);
    const outlets = await listOutlets(request, adminToken);
    expect(outlets.length).toBeGreaterThan(0);
    const outlet = outlets[0];
    const customerName = `Pelanggan E2E ${Date.now()}`;

    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setActiveOutlet(page, outlet.id);
    await page.reload();

    await page.goto('/pos');
    await page.getByRole('button', { name: 'Pelanggan baru' }).click();
    await expect(page.getByRole('dialog', { name: 'Pelanggan Baru' })).toBeVisible();

    await page.getByLabel('Nama', { exact: true }).fill(customerName);
    await page.getByLabel('Telepon (opsional)').fill('081234567890');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    await expect(page.getByRole('dialog', { name: 'Pelanggan Baru' })).toHaveCount(0);
    await expect(
      page.getByRole('combobox', { name: 'Pelanggan Terdaftar' }),
    ).toContainText(customerName);
  });
});
