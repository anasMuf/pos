import type { Order, ReceiptSetting } from '../../api/types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { buildReceiptData } from '../../lib/receipt';

const paperWidth: Record<string, string> = {
  '58mm': 'w-[58mm]',
  '80mm': 'w-[80mm]',
  A4: 'w-full max-w-md',
};

export function ReceiptView({
  order,
  settings,
  outletName,
}: {
  order: Order;
  settings: ReceiptSetting;
  outletName: string;
}) {
  const data = buildReceiptData(order, settings, outletName);
  const width = paperWidth[data.paperSize] ?? paperWidth['58mm'];

  return (
    <div
      className={`receipt-print mx-auto bg-white p-4 font-mono text-[11px] leading-tight text-gray-900 ${width}`}
      data-paper-size={data.paperSize}
    >
      <div className="text-center">
        <p className="text-sm font-bold">{data.header || outletName}</p>
        {data.taxLabel && data.taxNumber && (
          <p className="text-[10px]">
            {data.taxLabel}: {data.taxNumber}
          </p>
        )}
      </div>

      <div className="my-2 border-t border-dashed border-gray-300" />

      <div className="flex justify-between">
        <span>{data.orderNumber}</span>
        <span>{formatDateTime(data.createdAt)}</span>
      </div>
      {data.showCustomer && data.customerName && <p>Pelanggan: {data.customerName}</p>}
      {data.showCashier && <p>{data.cashierLabel}</p>}

      <div className="my-2 border-t border-dashed border-gray-300" />

      {data.lines.map((line) => (
        <div key={`${line.name}-${line.qty}-${line.unitPrice}-${line.subtotal}`} className="mb-1">
          <p>{line.name}</p>
          <div className="flex justify-between">
            <span>
              {line.qty} x {formatCurrency(line.unitPrice)}
            </span>
            <span>{formatCurrency(line.subtotal)}</span>
          </div>
        </div>
      ))}

      <div className="my-2 border-t border-dashed border-gray-300" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(data.subtotal)}</span>
      </div>
      {data.discountAmount > 0 && (
        <div className="flex justify-between">
          <span>Diskon</span>
          <span>-{formatCurrency(data.discountAmount)}</span>
        </div>
      )}
      {data.taxAmount > 0 && (
        <div className="flex justify-between">
          <span>Pajak</span>
          <span>{formatCurrency(data.taxAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>{formatCurrency(data.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Dibayar</span>
        <span>{formatCurrency(data.paid)}</span>
      </div>
      <div className="flex justify-between">
        <span>Sisa</span>
        <span>{formatCurrency(data.remaining)}</span>
      </div>
      <p className="mt-1">Status: {data.paymentStatus}</p>

      {data.showPaymentDetails && data.payments.length > 0 && (
        <>
          <div className="my-2 border-t border-dashed border-gray-300" />
          <p className="font-semibold">Pembayaran</p>
          {data.payments.map((payment) => (
            <div key={payment.key} className="flex justify-between">
              <span>
                {payment.typeLabel} · {payment.methodLabel}
              </span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </>
      )}

      {data.footer && (
        <>
          <div className="my-2 border-t border-dashed border-gray-300" />
          <p className="text-center">{data.footer}</p>
        </>
      )}
    </div>
  );
}
