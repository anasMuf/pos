export interface Capabilities {
  enable_variants: boolean;
  enable_modifiers: boolean;
  enable_dimension_pricing: boolean;
  enable_tiered_pricing: boolean;
  enable_order_workflow: boolean;
  enable_partial_payment: boolean;
  enable_staff_commission?: boolean;
}

export interface CapabilityDefinition {
  key: keyof Capabilities;
  label: string;
  description: string;
  default: boolean;
}

export type JsonValue = Record<string, unknown> | unknown[] | null;

export interface Tenant {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Outlet {
  id: number;
  tenant_id: number;
  name: string;
  address: string;
  capabilities: Capabilities;
  default_connection_mode: 'online' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface OutletMember {
  id: number;
  outlet_id: number;
  user_id: number;
  outlet_role: 'owner' | 'manager' | 'cashier' | 'operator';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLookup {
  id: number;
  full_name: string;
  username: string;
  email: string;
}

export type OutletRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'operator';
export type CommissionType = 'none' | 'percent' | 'fixed';

export interface OutletAccess {
  outlet_id: number;
  role: OutletRole;
  is_global_admin: boolean;
}

export type PricingType = 'fixed' | 'dimension' | 'tiered';

export interface Customer {
  id: number;
  outlet_id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export type PaperSize = '58mm' | '80mm' | 'A4';

export interface ReceiptSetting {
  id: number;
  outlet_id: number;
  header: string;
  footer: string;
  show_customer: boolean;
  show_cashier: boolean;
  show_payment_details: boolean;
  paper_size: PaperSize;
  tax_label: string;
  tax_number: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  outlet_id: number;
  name: string;
  sku: string;
  category: string;
  pricing_type: PricingType;
  base_price: number;
  track_inventory: boolean;
  stock_qty: number;
  min_stock_qty: number;
  pricing_rules: JsonValue;
  modifiers_config: JsonValue;
  commission_type?: CommissionType;
  commission_value?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  barcode: string;
  price_override: number;
  stock_qty: number;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'stock_in' | 'stock_out' | 'sale' | 'adjustment' | 'sync_reconcile';

export interface StockMovement {
  id: number;
  outlet_id: number;
  product_id: number;
  variant_id: number;
  user_id: number;
  movement_type: MovementType;
  qty_change: number;
  reference_type: string;
  reference_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CashShift {
  id: number;
  outlet_id: number;
  user_id: number;
  status: 'open' | 'closed';
  opening_cash: number;
  expected_cash: number;
  closing_cash: number;
  cash_difference: number;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'queued' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentType = 'full' | 'down_payment' | 'settlement';
export type PaymentMethod = 'cash' | 'qris' | 'transfer';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  item_name_snapshot: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  commission_amount?: number;
  meta_data: JsonValue;
  created_at: string;
}

export interface OrderPayment {
  id: number;
  order_id: number;
  shift_id: number;
  received_by_user_id: number;
  client_payment_id: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  paid_at: string;
  note: string;
  created_at: string;
}

export interface Order {
  id: number;
  outlet_id: number;
  shift_id: number;
  cashier_user_id: number;
  customer_id: number;
  client_sync_id: string;
  order_number: string;
  customer_name: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_amount: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  commission_amount?: number;
  total_amount: number;
  paid_amount: number;
  is_offline_created: boolean;
  client_created_at: string;
  synced_at: string | null;
  meta_data: JsonValue;
  items: OrderItem[];
  payments: OrderPayment[];
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  synced_count: number;
  duplicate_count: number;
  orders: Order[];
}

export interface ReportTotals {
  orders_count: number;
  revenue: number;
  paid_amount: number;
  outstanding: number;
  offline_orders: number;
  average_order_value: number;
}

export interface OutletReport {
  outlet_id: number;
  outlet_name: string;
  orders_count: number;
  revenue: number;
  paid_amount: number;
  outstanding: number;
  offline_orders: number;
}

export interface PaymentMethodReport {
  payment_method: string;
  amount: number;
  count: number;
}

export interface DailyReport {
  date: string;
  orders_count: number;
  revenue: number;
}

export interface ReportSummary {
  from: string;
  to: string;
  totals: ReportTotals;
  by_outlet: OutletReport[];
  by_payment_method: PaymentMethodReport[];
  daily: DailyReport[];
}

export interface SyncOrderSummary {
  id: number;
  order_number: string;
  outlet_id: number;
  outlet_name: string;
  client_created_at: string;
  synced_at: string | null;
  total_amount: number;
  payment_status: PaymentStatus;
}

export interface ReconciliationReport {
  from: string;
  to: string;
  offline_orders: number;
  online_orders: number;
  synced_offline_orders: number;
  offline_revenue: number;
  recent_offline: SyncOrderSummary[];
}

export interface StaffCommissionReport {
  user_id: number;
  user_name: string;
  orders_count: number;
  commission_amount: number;
}

export interface CommissionReport {
  from: string;
  to: string;
  total: number;
  by_staff: StaffCommissionReport[];
}
