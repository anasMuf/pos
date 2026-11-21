import { describe, expect, it } from 'vitest';
import { defaultReportRange, toISODate } from '../../src/lib/reports';

describe('toISODate', () => {
  it('pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('defaultReportRange', () => {
  it('starts at the first day of the current month', () => {
    expect(defaultReportRange(new Date(2026, 10, 21))).toEqual({
      from: '2026-11-01',
      to: '2026-11-21',
    });
  });

  it('handles the first day of the month', () => {
    expect(defaultReportRange(new Date(2026, 10, 1))).toEqual({
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });
});
