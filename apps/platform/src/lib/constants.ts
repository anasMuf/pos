import type {
  MovementType,
  OrderStatus,
  OutletRole,
  PaperSize,
  PaymentMethod,
  PaymentStatus,
} from '../api/types';

/**
 * Domain constants shared by forms and lists.
 *
 * Keep labels/options here instead of redeclaring them per page so a new method,
 * role, or movement type only has to be added once.
 */

type Option<T extends string> = { value: T; label: string };

type OutletMemberRole = Extract<OutletRole, 'owner' | 'manager' | 'cashier' | 'operator'>;

export const PAYMENT_METHOD_OPTIONS: Option<PaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
];

export const OUTLET_ROLE_OPTIONS: Option<OutletMemberRole>[] = [
  { value: 'owner', label: 'Pemilik' },
  { value: 'manager', label: 'Pengelola' },
  { value: 'cashier', label: 'Kasir' },
  { value: 'operator', label: 'Operator' },
];

export const PAPER_SIZE_OPTIONS: PaperSize[] = ['58mm', '80mm', 'A4'];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  stock_in: 'Stok Masuk',
  stock_out: 'Stok Keluar',
  sale: 'Penjualan',
  adjustment: 'Penyesuaian / Opname',
  sync_reconcile: 'Rekonsiliasi Sinkronisasi',
};

/** Movement types a user may record manually (sales/sync are system-generated). */
export const MANUAL_MOVEMENT_TYPES: Option<MovementType>[] = [
  { value: 'stock_in', label: MOVEMENT_TYPE_LABELS.stock_in },
  { value: 'stock_out', label: MOVEMENT_TYPE_LABELS.stock_out },
  { value: 'adjustment', label: MOVEMENT_TYPE_LABELS.adjustment },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  queued: 'Antrean',
  in_progress: 'Diproses',
  ready: 'Siap',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Belum bayar',
  partial: 'DP / Sebagian',
  paid: 'Lunas',
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, 'green' | 'yellow' | 'red'> = {
  paid: 'green',
  partial: 'yellow',
  unpaid: 'red',
};
