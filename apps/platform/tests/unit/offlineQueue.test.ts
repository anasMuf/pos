import { describe, expect, it } from 'vitest';
import { groupOrdersByOutlet, removeSyncedOrders, type OfflineOrder } from '../../src/lib/offlineQueue';

function offlineOrder(outletId: number, clientSyncId: string): OfflineOrder {
  return {
    outlet_id: outletId,
    client_sync_id: clientSyncId,
    client_created_at: new Date().toISOString(),
    items: [],
    payments: [],
  };
}

describe('groupOrdersByOutlet', () => {
  it('groups orders by outlet and strips outlet_id from payloads', () => {
    const groups = groupOrdersByOutlet([
      offlineOrder(1, 'a'),
      offlineOrder(2, 'b'),
      offlineOrder(1, 'c'),
    ]);

    expect(groups.size).toBe(2);
    expect(groups.get(1)?.map((order) => order.client_sync_id)).toEqual(['a', 'c']);
    expect(groups.get(2)?.map((order) => order.client_sync_id)).toEqual(['b']);
    expect('outlet_id' in (groups.get(1)?.[0] ?? {})).toBe(false);
  });

  it('returns an empty map for an empty queue', () => {
    expect(groupOrdersByOutlet([]).size).toBe(0);
  });
});

describe('removeSyncedOrders', () => {
  it('removes only the synced orders', () => {
    const queue = [offlineOrder(1, 'a'), offlineOrder(1, 'b'), offlineOrder(2, 'c')];
    const remaining = removeSyncedOrders(queue, [offlineOrder(1, 'a'), offlineOrder(2, 'c')]);

    expect(remaining.map((order) => order.client_sync_id)).toEqual(['b']);
  });

  it('keeps the queue when nothing was synced', () => {
    const queue = [offlineOrder(1, 'a')];
    expect(removeSyncedOrders(queue, [])).toHaveLength(1);
  });
});
