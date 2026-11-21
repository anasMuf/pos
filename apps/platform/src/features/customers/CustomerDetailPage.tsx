import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCustomer, useInfiniteOrders } from '../../api/queries';
import type { Order, PaymentStatus } from '../../api/types';
import {
  Badge,
  Card,
  EmptyState,
  InfiniteScrollSentinel,
  PageHeader,
  Spinner,
  Table,
} from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { ReceiptModal } from '../receipts/ReceiptModal';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { PAYMENT_STATUS_TONES } from '../../lib/constants';

export function CustomerDetailPage({ customerId }: { customerId: number }) {
  const { activeOutletId, activeOutlet, canOperate } = useApp();
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const {
    data: orderPages,
    isLoading: isLoadingOrders,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(
    { outlet_id: activeOutletId ?? undefined, customer_id: customerId },
    !!customer,
  );
  const orders = orderPages?.pages.flatMap((page) => page.items) ?? [];
  const totalOrders = orderPages?.pages[0]?.meta.total;

  if (isLoading) return <Spinner />;
  if (isError || !customer) {
    return (
      <div>
        <PageHeader title="Detail Pelanggan" />
        <EmptyState
          title="Pelanggan tidak ditemukan"
          description="Pelanggan tidak tersedia atau sudah dihapus."
          action={
            <Link
              to="/customers"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Kembali ke Pelanggan
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        description="Profil pelanggan dan riwayat pesanannya."
        action={
          <div className="flex items-center gap-2">
            {canOperate && (
              <Link
                to="/customers/$id/edit"
                params={{ id: String(customer.id) }}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
            <Link
              to="/customers"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        <Card title="Data Pelanggan">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Telepon</dt>
              <dd className="font-medium text-gray-900">{customer.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{customer.email || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Alamat</dt>
              <dd className="font-medium text-gray-900">{customer.address || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Catatan</dt>
              <dd className="font-medium text-gray-900">{customer.note || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Riwayat Pesanan">
          {isLoadingOrders ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada pesanan untuk pelanggan ini.</p>
          ) : (
            <>
              <Table headers={['Nomor', 'Tanggal', 'Total', 'Pembayaran', 'Aksi']}>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-3 py-2 text-gray-500">{formatDateTime(order.created_at)}</td>
                    <td className="px-3 py-2">{formatCurrency(order.total_amount)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={PAYMENT_STATUS_TONES[order.payment_status as PaymentStatus]}>
                        {order.payment_status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setReceiptOrder(order)}
                      >
                        Struk
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
              <InfiniteScrollSentinel
                hasNextPage={!!hasNextPage}
                isLoading={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                loadedCount={orders.length}
                total={totalOrders}
              />
            </>
          )}
        </Card>
      </div>

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
