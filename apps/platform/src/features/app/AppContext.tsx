import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  useOutletAccess,
  useOutlets,
  useSyncOrders,
} from '../../api/queries';
import type { Outlet, OutletRole, Product } from '../../api/types';
import { cacheProducts } from '../../lib/offlineDb';
import { canFulfillRole, canManageRole, canOperateRole } from '../../lib/roles';
import { deriveEffectiveMode } from '../../lib/connectivity';
import {
  removeSyncedOrders,
  type OfflineOrder,
} from '../../lib/offlineQueue';
import { useConnectivity } from './useConnectivity';
import { useAuth } from '../auth/AuthContext';

export type { OfflineOrder } from '../../lib/offlineQueue';

export type ConnectionMode = 'online' | 'offline';

const ACTIVE_OUTLET_KEY = 'pos_active_outlet_id';
const MODE_KEY = 'pos_connection_mode';
const QUEUE_KEY = 'pos_offline_orders';
const FAILED_KEY = 'pos_offline_failed_ids';
const QUEUE_EVENT = 'pos-queue-changed';

function readQueue(): OfflineOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOrder[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineOrder[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

function readFailedIds(): string[] {
  try {
    const raw = localStorage.getItem(FAILED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFailedIds(ids: string[]) {
  try {
    localStorage.setItem(FAILED_KEY, JSON.stringify(ids));
  } catch {
    // Storage is best-effort.
  }
}

interface AppContextType {
  outlets: Outlet[];
  activeOutlet: Outlet | null;
  activeOutletId: number | null;
  setActiveOutletId: (id: number) => void;
  role: OutletRole | null;
  isGlobalAdmin: boolean;
  canManage: boolean;
  canOperate: boolean;
  canFulfill: boolean;
  isLoadingOutlets: boolean;
  mode: ConnectionMode;
  effectiveMode: ConnectionMode;
  isConnected: boolean;
  checkConnection: () => Promise<boolean>;
  setMode: (mode: ConnectionMode) => void;
  toggleMode: () => void;
  pendingSyncCount: number;
  pendingOrders: OfflineOrder[];
  failedSyncIds: string[];
  isSyncing: boolean;
  syncNow: () => Promise<{ synced: number; failed: boolean; failedCount: number }>;
  retryOrder: (clientSyncId: string) => Promise<boolean>;
  enqueueOfflineOrder: (order: OfflineOrder) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: outlets = [], isLoading: isLoadingOutlets } = useOutlets(isAuthenticated);
  const { isConnected, checkNow } = useConnectivity();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  const [activeOutletId, setActiveOutletIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(ACTIVE_OUTLET_KEY);
    return raw ? Number(raw) : null;
  });
  const [mode, setModeState] = useState<ConnectionMode>(() => {
    const stored = localStorage.getItem(MODE_KEY);
    return stored === 'offline' ? 'offline' : 'online';
  });
  const [queue, setQueue] = useState<OfflineOrder[]>(() => readQueue());
  const [failedSyncIds, setFailedSyncIds] = useState<string[]>(() => readFailedIds());

  const { data: outletAccess } = useOutletAccess(isAuthenticated ? activeOutletId : null);
  const role = outletAccess?.role ?? null;
  const canManage = canManageRole(role);
  const canOperate = canOperateRole(role);
  const canFulfill = canFulfillRole(role);

  const syncMutation = useSyncOrders();

  useEffect(() => {
    if (outlets.length === 0) return;
    const known = activeOutletId !== null && outlets.some((outlet) => outlet.id === activeOutletId);
    if (!known) {
      setActiveOutletIdState(outlets[0].id);
      localStorage.setItem(ACTIVE_OUTLET_KEY, String(outlets[0].id));
    }
  }, [activeOutletId, outlets]);

  useEffect(() => {
    const refresh = () => setQueue(readQueue());
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(QUEUE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const setActiveOutletId = useCallback((id: number) => {
    localStorage.setItem(ACTIVE_OUTLET_KEY, String(id));
    setActiveOutletIdState(id);
  }, []);

  const setMode = useCallback((next: ConnectionMode) => {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'online' ? 'offline' : 'online');
  }, [mode, setMode]);

  const enqueueOfflineOrder = useCallback(
    (order: OfflineOrder) => {
      const next = [...readQueue(), order];
      writeQueue(next);
      setQueue(next);

      // Optimistically reduce cached stock so offline catalog stays realistic.
      const key = queryKeys.products(order.outlet_id);
      const current = queryClient.getQueryData<Product[]>(key);
      if (!current) return;

      const updated = current.map((product) => {
        if (!product.track_inventory) return product;
        const sold = order.items
          .filter((item) => item.product_id === product.id)
          .reduce((sum, item) => sum + item.qty, 0);
        if (sold === 0) return product;
        return { ...product, stock_qty: Math.max(0, product.stock_qty - sold) };
      });
      queryClient.setQueryData(key, updated);
      void cacheProducts(order.outlet_id, updated);
    },
    [queryClient],
  );

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return { synced: 0, failed: false, failedCount: 0 };
    }

    const pending = readQueue();
    if (pending.length === 0) {
      setFailedSyncIds([]);
      writeFailedIds([]);
      return { synced: 0, failed: false, failedCount: 0 };
    }

    syncingRef.current = true;

    let synced = 0;
    const failures: string[] = [];

    try {
      // Submit one order at a time so a single bad order cannot block the queue.
      for (const order of pending) {
        const { outlet_id, ...payload } = order;
        try {
          const result = await syncMutation.mutateAsync({ outlet_id, orders: [payload] });
          synced += result.synced_count + result.duplicate_count;
          const remaining = removeSyncedOrders(readQueue(), [order]);
          writeQueue(remaining);
          setQueue(remaining);
        } catch {
          failures.push(order.client_sync_id);
        }
      }
      writeFailedIds(failures);
      setFailedSyncIds(failures);
      return { synced, failed: failures.length > 0, failedCount: failures.length };
    } finally {
      syncingRef.current = false;
    }
  }, [syncMutation]);

  const retryOrder = useCallback(
    async (clientSyncId: string) => {
      const order = readQueue().find((item) => item.client_sync_id === clientSyncId);
      if (!order) {
        setFailedSyncIds((prev) => {
          const next = prev.filter((id) => id !== clientSyncId);
          writeFailedIds(next);
          return next;
        });
        return true;
      }

      const { outlet_id, ...payload } = order;
      try {
        await syncMutation.mutateAsync({ outlet_id, orders: [payload] });
        const remaining = removeSyncedOrders(readQueue(), [order]);
        writeQueue(remaining);
        setQueue(remaining);
        setFailedSyncIds((prev) => {
          const next = prev.filter((id) => id !== clientSyncId);
          writeFailedIds(next);
          return next;
        });
        return true;
      } catch {
        setFailedSyncIds((prev) => {
          if (prev.includes(clientSyncId)) return prev;
          const next = [...prev, clientSyncId];
          writeFailedIds(next);
          return next;
        });
        return false;
      }
    },
    [syncMutation],
  );

  const activeOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === activeOutletId) ?? null,
    [outlets, activeOutletId],
  );

  const effectiveMode = deriveEffectiveMode(mode, isConnected);

  // Keep the latest sync function without re-triggering effects on mutation state.
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // Auto-sync as soon as connectivity returns and there is pending work.
  useEffect(() => {
    if (mode !== 'online' || !isConnected || queue.length === 0) {
      return;
    }
    void syncNowRef.current();
  }, [mode, isConnected, queue.length]);

  // Periodically retry the outbox while online.
  useEffect(() => {
    if (mode !== 'online' || !isConnected || queue.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      void syncNowRef.current();
    }, 30000);
    return () => window.clearInterval(id);
  }, [mode, isConnected, queue.length]);

  const value: AppContextType = {
    outlets,
    activeOutlet,
    activeOutletId,
    setActiveOutletId,
    role,
    isGlobalAdmin: outletAccess?.is_global_admin ?? false,
    canManage,
    canOperate,
    canFulfill,
    isLoadingOutlets,
    mode,
    effectiveMode,
    isConnected,
    checkConnection: checkNow,
    setMode,
    toggleMode,
    pendingSyncCount: queue.length,
    pendingOrders: queue,
    failedSyncIds: failedSyncIds.filter((id) => queue.some((order) => order.client_sync_id === id)),
    isSyncing: syncMutation.isPending,
    syncNow,
    retryOrder,
    enqueueOfflineOrder,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
