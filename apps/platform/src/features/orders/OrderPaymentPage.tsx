import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useAddPayment, useCashShifts, useOrder } from '../../api/queries';
import type { PaymentMethod } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { CurrencyInput } from '../../components/atoms/CurrencyInput';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { FieldError } from '../../components/atoms/FieldError';
import { formatCurrency, formatDateTime, newClientId } from '../../lib/format';
import { PAYMENT_METHOD_OPTIONS } from '../../lib/constants';

export function OrderPaymentPage({ orderId }: { orderId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canOperate } = useApp();
  const { data: order, isLoading, isError } = useOrder(orderId);
  const { data: shifts = [] } = useCashShifts(order?.outlet_id);
  const addPayment = useAddPayment();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const openShift = shifts.find((shift) => shift.status === 'open');

  useEffect(() => {
    if (!order) return;
    setAmount(String(Math.max(0, order.total_amount - order.paid_amount)));
  }, [order]);

  if (!canOperate) {
    return (
      <div>
        <PageHeader title="Pembayaran Pesanan" />
        <AccessDenied message="Hanya kasir atau pengelola outlet yang dapat mencatat pembayaran." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;
  if (isError || !order) {
    return (
      <div>
        <PageHeader title="Pembayaran Pesanan" />
        <EmptyState
          title="Pesanan tidak ditemukan"
          description="Pesanan tidak tersedia atau Anda tidak memiliki akses."
          action={
            <Link to="/orders" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Kembali ke Pesanan
            </Link>
          }
        />
      </div>
    );
  }

  const remaining = Math.max(0, order.total_amount - order.paid_amount);

  const handleSubmit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Nominal pembayaran harus lebih dari 0.');
      document.getElementById('payment-amount')?.focus();
      return;
    }
    if (value > remaining) {
      setError(`Nominal melebihi sisa tagihan (${formatCurrency(remaining)}).`);
      document.getElementById('payment-amount')?.focus();
      return;
    }
    setError('');
    try {
      await addPayment.mutateAsync({
        id: orderId,
        shift_id: openShift?.id,
        client_payment_id: newClientId('sync-pay'),
        payment_type: 'settlement',
        payment_method: method,
        amount: value,
        note: note || 'Pelunasan',
      });
      addToast({ variant: 'success', title: 'Pembayaran tercatat', message: `${formatCurrency(value)} diterima.` });
      navigate({ to: '/orders' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Pembayaran gagal',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`Pembayaran ${order.order_number}`}
        description={`${order.customer_name || 'Walk-in'} · ${formatDateTime(order.created_at)}`}
        action={
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <dl className="mb-4 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Total</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Dibayar</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(order.paid_amount)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Sisa tagihan</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(remaining)}</dd>
          </div>
        </dl>

        {order.payment_status === 'paid' ? (
          <p className="text-sm text-gray-600">Pesanan ini sudah lunas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-amount">Nominal</Label>
                <button
                  type="button"
                  onClick={() => {
                    setAmount(String(remaining));
                    setError('');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Lunasi semua
                </button>
              </div>
              <CurrencyInput
                id="payment-amount"
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  setError('');
                }}
                className="mt-1"
                aria-invalid={!!error}
                aria-describedby={error ? 'payment-amount-error' : undefined}
              />
              <FieldError id="payment-amount-error" message={error} />
            </div>
            <div>
              <Label htmlFor="payment-method">Metode</Label>
              <Select
                id="payment-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="mt-1"
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="payment-note">Catatan</Label>
              <Input
                id="payment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opsional"
                className="mt-1"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {order.payment_status !== 'paid' && (
            <Button type="button" onClick={handleSubmit} disabled={addPayment.isPending}>
              {addPayment.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </Button>
          )}
          <Link
            to="/orders"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            {order.payment_status === 'paid' ? 'Kembali' : 'Batal'}
          </Link>
        </div>
      </Card>
    </div>
  );
}
