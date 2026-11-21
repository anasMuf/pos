import { afterEach, describe, expect, it } from 'vitest';
import {
  cacheOutletAccess,
  canFulfillRole,
  canManageRole,
  canOperateRole,
  clearOutletAccessCache,
  readCachedOutletAccess,
} from '../../src/lib/roles';

afterEach(() => {
  clearOutletAccessCache();
  localStorage.clear();
});

describe('role capabilities', () => {
  it('grants manage access to admin, owner, and manager', () => {
    expect(canManageRole('admin')).toBe(true);
    expect(canManageRole('owner')).toBe(true);
    expect(canManageRole('manager')).toBe(true);
    expect(canManageRole('cashier')).toBe(false);
    expect(canManageRole('operator')).toBe(false);
    expect(canManageRole(null)).toBe(false);
  });

  it('grants operate access to cashier plus managers', () => {
    expect(canOperateRole('cashier')).toBe(true);
    expect(canOperateRole('owner')).toBe(true);
    expect(canOperateRole('admin')).toBe(true);
    expect(canOperateRole('operator')).toBe(false);
    expect(canOperateRole(undefined)).toBe(false);
  });

  it('lets every outlet member update fulfillment status', () => {
    expect(canFulfillRole('operator')).toBe(true);
    expect(canFulfillRole('cashier')).toBe(true);
    expect(canFulfillRole('manager')).toBe(true);
    expect(canFulfillRole('owner')).toBe(true);
    expect(canFulfillRole('admin')).toBe(true);
    expect(canFulfillRole(null)).toBe(false);
  });
});

describe('outlet access cache', () => {
  it('round-trips cached access per outlet', () => {
    cacheOutletAccess({ outlet_id: 7, role: 'cashier', is_global_admin: false });
    cacheOutletAccess({ outlet_id: 8, role: 'owner', is_global_admin: false });

    expect(readCachedOutletAccess(7)?.role).toBe('cashier');
    expect(readCachedOutletAccess(8)?.role).toBe('owner');
    expect(readCachedOutletAccess(9)).toBeNull();
  });

  it('clears all cached outlet access', () => {
    cacheOutletAccess({ outlet_id: 1, role: 'manager', is_global_admin: false });
    clearOutletAccessCache();
    expect(readCachedOutletAccess(1)).toBeNull();
  });
});
