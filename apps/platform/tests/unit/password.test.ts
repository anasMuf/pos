import { describe, expect, it } from 'vitest';
import { passwordStrength } from '../../src/lib/password';

describe('passwordStrength', () => {
  it('rates short simple passwords as weak', () => {
    expect(passwordStrength('abc')).toBe('weak');
    expect(passwordStrength('abcdef')).toBe('weak');
  });

  it('rates mixed case with digits as medium', () => {
    expect(passwordStrength('Abcdef1')).toBe('medium');
  });

  it('rates long passwords with symbols as strong', () => {
    expect(passwordStrength('PosAdmin-2026-9f4c7d')).toBe('strong');
  });
});
