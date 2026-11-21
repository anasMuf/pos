import { describe, expect, it } from 'vitest';
import { escapeCSV, toCSV } from '../../src/lib/csv';

describe('escapeCSV', () => {
  it('leaves plain values unchanged', () => {
    expect(escapeCSV('abc')).toBe('abc');
  });

  it('returns an empty string for nullish values', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('quotes values containing commas', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
  });

  it('escapes double quotes', () => {
    expect(escapeCSV('a"b')).toBe('"a""b"');
  });

  it('quotes values containing newlines', () => {
    expect(escapeCSV('a\nb')).toBe('"a\nb"');
  });

  it('stringifies numbers', () => {
    expect(escapeCSV(42)).toBe('42');
  });
});

describe('toCSV', () => {
  it('builds a header and rows with CRLF', () => {
    expect(toCSV(['a', 'b'], [[1, 2], [3, 4]])).toBe('a,b\r\n1,2\r\n3,4');
  });

  it('escapes cells', () => {
    expect(toCSV(['name'], [['a,b']])).toBe('name\r\n"a,b"');
  });

  it('handles empty rows', () => {
    expect(toCSV(['a'], [])).toBe('a');
  });
});
