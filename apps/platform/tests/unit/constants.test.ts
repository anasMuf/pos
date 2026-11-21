import { describe, expect, it } from 'vitest';
import {
  MANUAL_MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from '../../src/lib/constants';

describe('domain constants', () => {
  it('labels every order status', () => {
    for (const status of ['queued', 'in_progress', 'ready', 'completed', 'cancelled'] as const) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('labels and tones every payment status', () => {
    for (const status of ['unpaid', 'partial', 'paid'] as const) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeTruthy();
      expect(PAYMENT_STATUS_TONES[status]).toBeTruthy();
    }
  });

  it('labels every movement type', () => {
    for (const type of ['stock_in', 'stock_out', 'sale', 'adjustment', 'sync_reconcile'] as const) {
      expect(MOVEMENT_TYPE_LABELS[type]).toBeTruthy();
    }
    expect(MANUAL_MOVEMENT_TYPES.map((type) => type.value)).toEqual([
      'stock_in',
      'stock_out',
      'adjustment',
    ]);
  });

  it('exposes the supported payment methods', () => {
    expect(PAYMENT_METHOD_OPTIONS.map((method) => method.value)).toEqual([
      'cash',
      'qris',
      'transfer',
    ]);
  });
});
