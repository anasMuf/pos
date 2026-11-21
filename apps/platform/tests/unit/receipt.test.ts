import { describe, expect, it } from 'vitest';
import type { Order, ReceiptSetting } from '../../src/api/types';
import { buildReceiptData } from '../../src/lib/receipt';

function settings(overrides: Partial<ReceiptSetting> = {}): ReceiptSetting {
  return {
    id: 1,
    outlet_id: 2,
    header: '',
    footer: 'Terima kasih',
    show_customer: true,
    show_cashier: true,
    show_payment_details: true,
    paper_size: '58mm',
    tax_label: '',
    tax_number: '',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    outlet_id: 2,
    shift_id: 1,
    cashier_user_id: 3,
    customer_id: 4,
    client_sync_id: 'sync-1',
    order_number: 'ORD-1',
    customer_name: 'Budi',
    order_status: 'completed',
    payment_status: 'partial',
    subtotal_amount: 102000,
    total_amount: 102000,
    paid_amount: 50000,
    is_offline_created: false,
    client_created_at: '',
    synced_at: null,
    meta_data: {},
    items: [
      {
        id: 1,
        order_id: 1,
        product_id: 1,
        variant_id: 0,
        item_name_snapshot: 'Banner',
        qty: 1,
        unit_price: 102000,
        subtotal: 102000,
        meta_data: {},
        created_at: '',
      },
    ],
    payments: [
      {
        id: 1,
        order_id: 1,
        shift_id: 1,
        received_by_user_id: 3,
        client_payment_id: 'pay-1',
        payment_type: 'down_payment',
        payment_method: 'cash',
        amount: 50000,
        paid_at: '2026-11-21T10:00:00Z',
        note: '',
        created_at: '',
      },
    ],
    created_at: '2026-11-21T10:00:00Z',
    updated_at: '',
    ...overrides,
  };
}

describe('buildReceiptData', () => {
  it('computes the remaining balance', () => {
    const data = buildReceiptData(order(), settings(), 'Outlet Print');
    expect(data.remaining).toBe(52000);
    expect(data.total).toBe(102000);
    expect(data.paid).toBe(50000);
  });

  it('labels payments', () => {
    const data = buildReceiptData(order(), settings(), 'Outlet Print');
    expect(data.payments[0]).toMatchObject({
      typeLabel: 'DP',
      methodLabel: 'Cash',
      amount: 50000,
    });
  });

  it('falls back to the outlet name when no header is configured', () => {
    expect(buildReceiptData(order(), settings({ header: '' }), 'Outlet Print').header).toBe('Outlet Print');
    expect(buildReceiptData(order(), settings({ header: 'Toko A' }), 'Outlet Print').header).toBe('Toko A');
  });

  it('carries visibility flags and paper size', () => {
    const data = buildReceiptData(
      order(),
      settings({ show_customer: false, show_cashier: false, show_payment_details: false, paper_size: '80mm' }),
      'Outlet Print',
    );
    expect(data.showCustomer).toBe(false);
    expect(data.showCashier).toBe(false);
    expect(data.showPaymentDetails).toBe(false);
    expect(data.paperSize).toBe('80mm');
  });

  it('maps receipt lines', () => {
    const data = buildReceiptData(order(), settings(), 'Outlet Print');
    expect(data.lines).toEqual([
      { name: 'Banner', qty: 1, unitPrice: 102000, subtotal: 102000 },
    ]);
  });
});
