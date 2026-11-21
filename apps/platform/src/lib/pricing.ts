import type { Product, ProductVariant } from '../api/types';

export interface ProductModifier {
  name: string;
  price: number;
}

export function getProductModifiers(product: Product): ProductModifier[] {
  if (!Array.isArray(product.modifiers_config)) return [];
  return (product.modifiers_config as Array<Record<string, unknown>>)
    .filter((item) => item && typeof item.name === 'string')
    .map((item) => ({ name: String(item.name), price: Number(item.price) || 0 }));
}

export function tierUnitPrice(product: Product, qty: number): number {
  const rules = product.pricing_rules as Record<string, unknown> | null;
  const tiers =
    rules && Array.isArray(rules.tiers) ? (rules.tiers as Array<Record<string, unknown>>) : [];
  const tier = tiers.find(
    (t) => qty >= Number(t.min_qty) && qty <= Number(t.max_qty ?? Number.POSITIVE_INFINITY),
  );
  return tier ? Number(tier.price) || product.base_price : product.base_price;
}

export function dimensionMeta(product: Product): { unit: string; minArea: number } {
  const rules = (product.pricing_rules ?? {}) as Record<string, unknown>;
  return {
    unit: typeof rules.unit === 'string' ? rules.unit : 'm',
    minArea: Number(rules.min_area) || 0,
  };
}

export function computeDimensionArea(width: number, height: number, minArea: number): number {
  return Math.max(width * height || 0, minArea);
}

export interface LinePriceInput {
  product: Product;
  variant?: ProductVariant;
  qty: number;
  width: number;
  height: number;
  selectedModifiers: string[];
  dimensionEnabled: boolean;
  tieredEnabled: boolean;
}

export interface LinePrice {
  unitPrice: number;
  subtotal: number;
  area: number;
  minArea: number;
  modifierTotal: number;
  modifiers: ProductModifier[];
  dimensionActive: boolean;
  dimensionUnit: string;
  dimensionInvalid: boolean;
}

// Mirrors the server pricing rules for UI display. The server remains authoritative.
export function priceLine(input: LinePriceInput): LinePrice {
  const {
    product,
    variant,
    qty,
    width,
    height,
    selectedModifiers,
    dimensionEnabled,
    tieredEnabled,
  } = input;

  const modifiers = getProductModifiers(product);
  const modifierTotal = modifiers
    .filter((modifier) => selectedModifiers.includes(modifier.name))
    .reduce((sum, modifier) => sum + modifier.price, 0);

  const { unit, minArea } = dimensionMeta(product);
  const area = computeDimensionArea(width, height, minArea);
  const dimensionActive = dimensionEnabled && product.pricing_type === 'dimension';
  const dimensionInvalid = dimensionActive && (width <= 0 || height <= 0);

  let unitPrice = variant && variant.price_override > 0 ? variant.price_override : product.base_price;
  if (dimensionActive) {
    unitPrice = product.base_price * (area || 1);
  } else if (tieredEnabled && product.pricing_type === 'tiered') {
    unitPrice = tierUnitPrice(product, qty);
  }
  unitPrice += modifierTotal;

  return {
    unitPrice,
    subtotal: unitPrice * qty,
    area,
    minArea,
    modifierTotal,
    modifiers,
    dimensionActive,
    dimensionUnit: unit,
    dimensionInvalid,
  };
}
