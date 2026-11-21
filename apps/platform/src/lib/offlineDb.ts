import type { Outlet, Product, ReceiptSetting } from '../api/types';

const DB_NAME = 'pos-offline';
const DB_VERSION = 2;
const PRODUCTS_STORE = 'products';
const OUTLETS_STORE = 'outlets';
const RECEIPT_SETTINGS_STORE = 'receipt-settings';
const REPORTS_STORE = 'reports';
const OUTLETS_KEY = 'all';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'outletId' });
      }
      if (!db.objectStoreNames.contains(OUTLETS_STORE)) {
        db.createObjectStore(OUTLETS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(RECEIPT_SETTINGS_STORE)) {
        db.createObjectStore(RECEIPT_SETTINGS_STORE, { keyPath: 'outletId' });
      }
      if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        db.createObjectStore(REPORTS_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheProducts(outletId: number, products: Product[]): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
    tx.objectStore(PRODUCTS_STORE).put({ outletId, products, updatedAt: Date.now() });
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    // Cache is best-effort; ignore failures.
  }
}

export async function getCachedProducts(outletId: number): Promise<Product[] | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openDb();
    return await new Promise<Product[] | null>((resolve) => {
      const tx = db.transaction(PRODUCTS_STORE, 'readonly');
      const request = tx.objectStore(PRODUCTS_STORE).get(outletId);
      request.onsuccess = () => {
        const record = request.result as { products?: Product[] } | undefined;
        resolve(record?.products ?? null);
      };
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function cacheOutlets(outlets: Outlet[]): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    const tx = db.transaction(OUTLETS_STORE, 'readwrite');
    tx.objectStore(OUTLETS_STORE).put({ key: OUTLETS_KEY, outlets, updatedAt: Date.now() });
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    // Cache is best-effort; ignore failures.
  }
}

export async function getCachedOutlets(): Promise<Outlet[] | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openDb();
    return await new Promise<Outlet[] | null>((resolve) => {
      const tx = db.transaction(OUTLETS_STORE, 'readonly');
      const request = tx.objectStore(OUTLETS_STORE).get(OUTLETS_KEY);
      request.onsuccess = () => {
        const record = request.result as { outlets?: Outlet[] } | undefined;
        resolve(record?.outlets ?? null);
      };
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function cacheReceiptSettings(
  outletId: number,
  settings: ReceiptSetting,
): Promise<void> {
  await putRecord(RECEIPT_SETTINGS_STORE, { outletId, settings, updatedAt: Date.now() });
}

export async function getCachedReceiptSettings(outletId: number): Promise<ReceiptSetting | null> {
  const record = await getRecord<{ settings?: ReceiptSetting }>(RECEIPT_SETTINGS_STORE, outletId);
  return record?.settings ?? null;
}

export async function cacheReport(key: string, data: unknown): Promise<void> {
  await putRecord(REPORTS_STORE, { key, data, updatedAt: Date.now() });
}

export async function getCachedReport<T>(key: string): Promise<T | null> {
  const record = await getRecord<{ data?: T }>(REPORTS_STORE, key);
  return record?.data ?? null;
}

async function putRecord(store: string, value: unknown): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    // Cache is best-effort; ignore failures.
  }
}

async function getRecord<T>(store: string, key: string | number): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}
