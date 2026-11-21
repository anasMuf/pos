import { describe, expect, it } from 'vitest';
import {
  FALLBACK_CAPABILITIES,
  capabilitiesForPreset,
  emptyCapabilities,
} from '../../src/lib/capabilities';

describe('capability presets', () => {
  it('starts from defaults', () => {
    const base = emptyCapabilities(FALLBACK_CAPABILITIES);
    expect(base.enable_variants).toBe(false);
    expect(base.enable_staff_commission).toBe(false);
  });

  it('applies a preset without keeping previous flags', () => {
    const print = capabilitiesForPreset(FALLBACK_CAPABILITIES, {
      enable_variants: true,
      enable_modifiers: true,
      enable_dimension_pricing: true,
      enable_tiered_pricing: true,
      enable_order_workflow: true,
      enable_partial_payment: true,
    });
    expect(print.enable_variants).toBe(true);
    expect(print.enable_partial_payment).toBe(true);

    const retailOnly = capabilitiesForPreset(FALLBACK_CAPABILITIES, {
      enable_variants: true,
      enable_tiered_pricing: true,
    });
    expect(retailOnly.enable_variants).toBe(true);
    expect(retailOnly.enable_dimension_pricing).toBe(false);
    expect(retailOnly.enable_partial_payment).toBe(false);
  });

  it('resets all flags when the preset is cleared', () => {
    const cleared = capabilitiesForPreset(FALLBACK_CAPABILITIES, null);
    expect(cleared.enable_variants).toBe(false);
    expect(cleared.enable_modifiers).toBe(false);
    expect(cleared.enable_dimension_pricing).toBe(false);
    expect(cleared.enable_tiered_pricing).toBe(false);
    expect(cleared.enable_order_workflow).toBe(false);
    expect(cleared.enable_partial_payment).toBe(false);
    expect(cleared.enable_staff_commission).toBe(false);
  });
});
