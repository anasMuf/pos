import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant } from '../../src/api/types';
import {
  computeDimensionArea,
  dimensionMeta,
  getProductModifiers,
  priceLine,
  tierUnitPrice,
} from '../../src/lib/pricing';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    outlet_id: 1,
    name: 'Product',
    sku: 'SKU-1',
    category: 'Umum',
    pricing_type: 'fixed',
    base_price: 10000,
    track_inventory: true,
    stock_qty: 10,
    min_stock_qty: 0,
    pricing_rules: {},
    modifiers_config: [],
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('getProductModifiers', () => {
  it('parses valid modifier configs', () => {
    const modifiers = getProductModifiers(
      product({ modifiers_config: [{ name: 'Mata Ayam', price: 2000 }, { name: 'Laminasi', price: 5000 }] }),
    );
    expect(modifiers).toEqual([
      { name: 'Mata Ayam', price: 2000 },
      { name: 'Laminasi', price: 5000 },
    ]);
  });

  it('returns an empty list for invalid configs', () => {
    expect(getProductModifiers(product({ modifiers_config: null }))).toEqual([]);
    expect(getProductModifiers(product({ modifiers_config: { name: 'x' } }))).toEqual([]);
  });
});

describe('tierUnitPrice', () => {
  const tiered = product({
    pricing_type: 'tiered',
    base_price: 45000,
    pricing_rules: {
      tiers: [
        { min_qty: 1, max_qty: 11, price: 45000 },
        { min_qty: 12, max_qty: 999, price: 40000 },
      ],
    },
  });

  it('uses the matching tier', () => {
    expect(tierUnitPrice(tiered, 2)).toBe(45000);
    expect(tierUnitPrice(tiered, 12)).toBe(40000);
  });

  it('falls back to base price when no tier matches', () => {
    expect(tierUnitPrice(tiered, 1000)).toBe(45000);
  });
});

describe('dimension helpers', () => {
  it('reads unit and minimum area', () => {
    const dimension = product({ pricing_rules: { unit: 'cm', min_area: 2 } });
    expect(dimensionMeta(dimension)).toEqual({ unit: 'cm', minArea: 2 });
    expect(dimensionMeta(product({ pricing_rules: null }))).toEqual({ unit: 'm', minArea: 0 });
  });

  it('applies the minimum area', () => {
    expect(computeDimensionArea(4, 1, 1)).toBe(4);
    expect(computeDimensionArea(1, 1, 2)).toBe(2);
    expect(computeDimensionArea(0, 0, 0)).toBe(0);
  });
});

describe('priceLine', () => {
  const banner = product({
    pricing_type: 'dimension',
    base_price: 25000,
    pricing_rules: { unit: 'm', min_area: 1 },
    modifiers_config: [{ name: 'Mata Ayam', price: 2000 }],
  });

  it('prices dimension + modifier', () => {
    const priced = priceLine({
      product: banner,
      qty: 1,
      width: 4,
      height: 1,
      selectedModifiers: ['Mata Ayam'],
      dimensionEnabled: true,
      tieredEnabled: true,
    });
    expect(priced.unitPrice).toBe(102000);
    expect(priced.subtotal).toBe(102000);
    expect(priced.area).toBe(4);
    expect(priced.dimensionInvalid).toBe(false);
  });

  it('flags dimension items without width/height', () => {
    const priced = priceLine({
      product: banner,
      qty: 1,
      width: 0,
      height: 0,
      selectedModifiers: [],
      dimensionEnabled: true,
      tieredEnabled: true,
    });
    expect(priced.dimensionInvalid).toBe(true);
  });

  it('uses variant price override for fixed products', () => {
    const fixed = product({ pricing_type: 'fixed', base_price: 10000 });
    const variant: ProductVariant = {
      id: 7,
      product_id: 1,
      name: 'Premium',
      sku: 'SKU-1-P',
      barcode: '',
      price_override: 15000,
      stock_qty: 5,
      created_at: '',
      updated_at: '',
    };
    const priced = priceLine({
      product: fixed,
      variant,
      qty: 2,
      width: 0,
      height: 0,
      selectedModifiers: [],
      dimensionEnabled: true,
      tieredEnabled: true,
    });
    expect(priced.unitPrice).toBe(15000);
    expect(priced.subtotal).toBe(30000);
  });

  it('applies tiered pricing by quantity', () => {
    const tiered = product({
      pricing_type: 'tiered',
      base_price: 45000,
      pricing_rules: {
        tiers: [
          { min_qty: 1, max_qty: 11, price: 45000 },
          { min_qty: 12, max_qty: 999, price: 40000 },
        ],
      },
    });
    const priced = priceLine({
      product: tiered,
      qty: 12,
      width: 0,
      height: 0,
      selectedModifiers: [],
      dimensionEnabled: true,
      tieredEnabled: true,
    });
    expect(priced.unitPrice).toBe(40000);
    expect(priced.subtotal).toBe(480000);
  });
});
