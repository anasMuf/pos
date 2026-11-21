import type { Order, ReceiptSetting } from '../api/types';

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptPaymentLine {
  key: number;
  typeLabel: string;
  methodLabel: string;
  amount: number;
  paidAt: string;
}

export interface ReceiptData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  cashierLabel: string;
  lines: ReceiptLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paid: number;
  remaining: number;
  paymentStatus: string;
  payments: ReceiptPaymentLine[];
  header: string;
  footer: string;
  taxLabel: string;
  taxNumber: string;
  paperSize: string;
  showCustomer: boolean;
  showCashier: boolean;
  showPaymentDetails: boolean;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  full: 'Lunas',
  down_payment: 'DP',
  settlement: 'Pelunasan',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  qris: 'QRIS',
  transfer: 'Transfer',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildReceiptData(
  order: Order,
  settings: ReceiptSetting,
  outletName: string,
): ReceiptData {
  const remaining = Math.max(0, round2(order.total_amount - order.paid_amount));

  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    customerName: order.customer_name,
    cashierLabel: `Kasir #${order.cashier_user_id}`,
    lines: (order.items ?? []).map((item) => ({
      name: item.item_name_snapshot,
      qty: item.qty,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
    subtotal: order.subtotal_amount,
    discountAmount: order.discount_amount ?? 0,
    taxAmount: order.tax_amount ?? 0,
    total: order.total_amount,
    paid: order.paid_amount,
    remaining,
    paymentStatus: order.payment_status,
    payments: (order.payments ?? []).map((payment) => ({
      key: payment.id,
      typeLabel: PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type,
      methodLabel: PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method,
      amount: payment.amount,
      paidAt: payment.paid_at,
    })),
    header: settings.header || outletName,
    footer: settings.footer,
    taxLabel: settings.tax_label,
    taxNumber: settings.tax_number,
    paperSize: settings.paper_size,
    showCustomer: settings.show_customer,
    showCashier: settings.show_cashier,
    showPaymentDetails: settings.show_payment_details,
  };
}
