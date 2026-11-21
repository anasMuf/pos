import type { OutletAccess } from '../api/types';

const ACCESS_KEY_PREFIX = 'pos_outlet_access_';

/** Owner/manager (and platform admin) can change catalog, stock, members, capabilities. */
export function canManageRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'owner' || role === 'manager';
}

/** Cashier-level operations (sales, payments, shifts, customers). */
export function canOperateRole(role: string | null | undefined): boolean {
  return canManageRole(role) || role === 'cashier';
}

/**
 * Fulfillment updates (order work status). Any active outlet member may move a
 * queued order forward, including production operators.
 */
export function canFulfillRole(role: string | null | undefined): boolean {
  return canOperateRole(role) || role === 'operator';
}

/**
 * Cache the outlet role so the UI can still gate navigation while offline.
 * Server remains the source of truth for every mutation.
 */
export function cacheOutletAccess(access: OutletAccess): void {
  try {
    localStorage.setItem(`${ACCESS_KEY_PREFIX}${access.outlet_id}`, JSON.stringify(access));
  } catch {
    // Storage is best-effort.
  }
}

export function readCachedOutletAccess(outletId: number): OutletAccess | null {
  try {
    const raw = localStorage.getItem(`${ACCESS_KEY_PREFIX}${outletId}`);
    return raw ? (JSON.parse(raw) as OutletAccess) : null;
  } catch {
    return null;
  }
}

export function clearOutletAccessCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(ACCESS_KEY_PREFIX));
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // Storage is best-effort.
  }
}
