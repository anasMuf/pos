import { describe, expect, it } from 'vitest';
import { deriveEffectiveMode } from '../../src/lib/connectivity';

describe('deriveEffectiveMode', () => {
  it('stays online when the connection is healthy', () => {
    expect(deriveEffectiveMode('online', true)).toBe('online');
  });

  it('falls back to offline when the connection is lost', () => {
    expect(deriveEffectiveMode('online', false)).toBe('offline');
  });

  it('respects a manual offline choice regardless of connectivity', () => {
    expect(deriveEffectiveMode('offline', true)).toBe('offline');
    expect(deriveEffectiveMode('offline', false)).toBe('offline');
  });
});
