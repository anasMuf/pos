import type { SyncOrderPayload } from '../api/queries';

export interface OfflineOrder extends SyncOrderPayload {
  outlet_id: number;
}

export function groupOrdersByOutlet(queue: OfflineOrder[]): Map<number, SyncOrderPayload[]> {
  const groups = new Map<number, SyncOrderPayload[]>();
  for (const { outlet_id, ...order } of queue) {
    const list = groups.get(outlet_id) ?? [];
    list.push(order);
    groups.set(outlet_id, list);
  }
  return groups;
}

// Removes orders that were part of a completed sync batch, keeping newer ones.
export function removeSyncedOrders(queue: OfflineOrder[], synced: OfflineOrder[]): OfflineOrder[] {
  const syncedIds = new Set(synced.map((order) => order.client_sync_id));
  return queue.filter((order) => !syncedIds.has(order.client_sync_id));
}
