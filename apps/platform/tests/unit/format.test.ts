import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber, newClientId } from '../../src/lib/format';

describe('formatCurrency', () => {
  it('formats a number as IDR', () => {
    expect(formatCurrency(1000)).toContain('1.000');
  });

  it('treats null as zero', () => {
    expect(formatCurrency(null)).toContain('0');
  });
});

describe('formatNumber', () => {
  it('formats decimals with up to three fraction digits', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });
});

describe('formatDate', () => {
  it('returns a dash for empty values', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('newClientId', () => {
  it('prefixes the generated id', () => {
    expect(newClientId('ord')).toMatch(/^ord-\d+-[a-z0-9]+$/);
  });

  it('generates unique ids', () => {
    expect(newClientId('ord')).not.toBe(newClientId('ord'));
  });
});
