import type { Capabilities, CapabilityDefinition } from '../api/types';

/**
 * Fallback used when the capability registry cannot be fetched (e.g. first load
 * while offline). The API registry in `apps/api/model/capability.go` is the
 * source of truth; keep this list in sync only as an offline safety net.
 */
export const FALLBACK_CAPABILITIES: CapabilityDefinition[] = [
  { key: 'enable_variants', label: 'Varian Produk', description: 'Ukuran, warna, jenis', default: false },
  {
    key: 'enable_modifiers',
    label: 'Modifier / Tambahan',
    description: 'Topping, finishing, catatan',
    default: false,
  },
  {
    key: 'enable_dimension_pricing',
    label: 'Harga Dimensi',
    description: 'Hitung per luas / ukuran',
    default: false,
  },
  {
    key: 'enable_tiered_pricing',
    label: 'Harga Bertingkat',
    description: 'Harga turun berdasarkan qty',
    default: false,
  },
  {
    key: 'enable_order_workflow',
    label: 'Alur Pesanan',
    description: 'Antrean → proses → siap → selesai',
    default: false,
  },
  { key: 'enable_partial_payment', label: 'DP / Pelunasan', description: 'Pembayaran bertahap', default: false },
  {
    key: 'enable_staff_commission',
    label: 'Komisi Staf',
    description: 'Perhitungan komisi operator (PTH)',
    default: false,
  },
];

const REGISTRY_KEY = 'pos_capability_registry';

export function readCachedRegistry(): CapabilityDefinition[] | null {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as CapabilityDefinition[]) : null;
  } catch {
    return null;
  }
}

export function cacheRegistry(definitions: CapabilityDefinition[]): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(definitions));
  } catch {
    // Storage is best-effort.
  }
}

export function emptyCapabilities(definitions: CapabilityDefinition[]): Capabilities {
  const base: Capabilities = {
    enable_variants: false,
    enable_modifiers: false,
    enable_dimension_pricing: false,
    enable_tiered_pricing: false,
    enable_order_workflow: false,
    enable_partial_payment: false,
    enable_staff_commission: false,
  };
  for (const definition of definitions) {
    base[definition.key] = definition.default;
  }
  return base;
}

/**
 * Resolve a preset against the capability defaults. Applying a preset always
 * replaces the current flags, so switching presets does not accumulate.
 */
export function capabilitiesForPreset(
  definitions: CapabilityDefinition[],
  overrides?: Partial<Capabilities> | null,
): Capabilities {
  return { ...emptyCapabilities(definitions), ...(overrides ?? {}) };
}
