import { describe, expect, it } from 'vitest';
import { shouldForceLogout } from '../../src/lib/authState';

describe('shouldForceLogout', () => {
  it('never logs out without an error', () => {
    expect(shouldForceLogout(false, undefined, false)).toBe(false);
    expect(shouldForceLogout(false, 401, true)).toBe(false);
  });

  it('logs out on 401 even with a cached profile', () => {
    expect(shouldForceLogout(true, 401, true)).toBe(true);
    expect(shouldForceLogout(true, 401, false)).toBe(true);
  });

  it('keeps the session on network errors when a profile is cached', () => {
    expect(shouldForceLogout(true, undefined, true)).toBe(false);
    expect(shouldForceLogout(true, 500, true)).toBe(false);
  });

  it('logs out when there is no cached profile to fall back to', () => {
    expect(shouldForceLogout(true, undefined, false)).toBe(true);
    expect(shouldForceLogout(true, 500, false)).toBe(true);
  });
});
