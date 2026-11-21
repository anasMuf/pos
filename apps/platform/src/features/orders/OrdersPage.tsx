import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useInfiniteOrders, useUpdateOrderStatus } from '../../api/queries';
import type { Order, OrderStatus, PaymentStatus } from '../../api/types';
import {
  Badge,
  Card,
  EmptyState,
  InfiniteScrollSentinel,
  PageHeader,
  Spinner,
} from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Select } from '../../components/atoms/Select';
import { Input } from '../../components/atoms/Input';
import { useToast } from '../../components/molecules/Toast';
import { ReceiptModal } from '../receipts/ReceiptModal';
import { formatCurrency, formatDateTime } from '../../lib/format';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  queued: 'Antrean',
  in_progress: 'Diproses',
  ready: 'Siap',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const PAYMENT_TONES: Record<PaymentStatus, 'green' | 'yellow' | 'red'> = {
  paid: 'green',
  partial: 'yellow',
  unpaid: 'red',
};

export function OrdersPage() {
  const { activeOutletId, activeOutlet, outlets, canOperate, canFulfill } = useApp();
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({
      outlet_id: activeOutletId ?? undefined,
      order_status: statusFilter || undefined,
      payment_status: paymentFilter || undefined,
      search: search.trim() || undefined,
    }),
    [activeOutletId, statusFilter, paymentFilter, search],
  );

  const {
    data: orderPages,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(filters);
  const orders = orderPages?.pages.flatMap((page) => page.items) ?? [];
  const totalOrders = orderPages?.pages[0]?.meta.total;
  const updateStatus = useUpdateOrderStatus();
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const handleStatusChange = async (order: Order, next: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, order_status: next });
      addToast({ variant: 'success', title: 'Status diperbarui', message: `${order.order_number} → ${ORDER_STATUS_LABELS[next]}` });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal memperbarui status',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Pesanan" description="Daftar dan alur pengerjaan pesanan." />
        <EmptyState
          title="Belum ada outlet"
          description="Buat outlet terlebih dahulu."
          action={
            <Link to="/outlets/new" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Buat Outlet
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pesanan"
        description={activeOutlet ? `Pesanan pada ${activeOutlet.name}` : 'Daftar pesanan.'}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="ml-1">Muat ulang</span>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nomor pesanan / pelanggan"
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatus | '')}>
          <option value="">Semua status pengerjaan</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentStatus | '')}>
          <option value="">Semua status pembayaran</option>
          <option value="unpaid">Belum bayar</option>
          <option value="partial">DP / Sebagian</option>
          <option value="paid">Lunas</option>
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Pesanan yang dibuat dari kasir akan tampil di sini."
          action={
            <Link to="/pos" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Buka Kasir
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                    <Badge tone={PAYMENT_TONES[order.payment_status]}>{order.payment_status}</Badge>
                    <Badge tone="indigo">{ORDER_STATUS_LABELS[order.order_status] ?? order.order_status}</Badge>
                    {order.is_offline_created && <Badge tone="gray">offline</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {order.customer_name || 'Walk-in'} · {formatDateTime(order.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {order.items?.length ?? 0} item · Total {formatCurrency(order.total_amount)} · Dibayar{' '}
                    {formatCurrency(order.paid_amount)}
                  </p>
                  {order.items && order.items.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                      {order.items.map((item) => `${item.item_name_snapshot} ×${item.qty}`).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <div className="w-40">
                    <Select
                      value={order.order_status}
                      onChange={(event) => handleStatusChange(order, event.target.value as OrderStatus)}
                      disabled={!canFulfill}
                      aria-label="Ubah status pengerjaan"
                    >
                      {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {canOperate && order.payment_status !== 'paid' && order.order_status !== 'cancelled' && (
                    <Link
                      to="/orders/$id/payment"
                      params={{ id: String(order.id) }}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Pelunasan
                    </Link>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setReceiptOrder(order)}
                  >
                    Struk
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            loadedCount={orders.length}
            total={totalOrders}
          />
        </div>
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          outletId={receiptOrder.outlet_id}
          outletName={activeOutlet?.name ?? 'Outlet'}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}
