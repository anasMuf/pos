import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useDeleteCustomer, useInfiniteCustomers, useOrders } from '../../api/queries';
import type { Customer, Order } from '../../api/types';
import {
  Badge,
  Card,
  EmptyState,
  InfiniteScrollSentinel,
  ListSkeleton,
  PageHeader,
  Table,
} from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useToast } from '../../components/molecules/Toast';
import { ReceiptModal } from '../receipts/ReceiptModal';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { PAYMENT_STATUS_TONES } from '../../lib/constants';

export function CustomersPage() {
  const { activeOutletId, activeOutlet, outlets, canOperate, canManage } = useApp();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const {
    data: customerPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCustomers(activeOutletId ?? undefined, search.trim() || undefined);
  const customers = customerPages?.pages.flatMap((page) => page.items) ?? [];
  const totalCustomers = customerPages?.pages[0]?.meta.total;
  const deleteCustomer = useDeleteCustomer();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  const { data: selectedHistory = [] } = useOrders(
    { outlet_id: activeOutletId ?? undefined, customer_id: selected?.id },
    !!selected,
  );

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Pelanggan" description="Data pelanggan dan riwayat pesanan." />
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

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCustomer.mutateAsync(toDelete.id);
      if (selected?.id === toDelete.id) setSelected(null);
      addToast({ variant: 'success', title: 'Pelanggan dihapus', message: toDelete.name });
      setToDelete(null);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menghapus pelanggan',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  const rows = selectedHistory;

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description={activeOutlet ? `Pelanggan pada ${activeOutlet.name}` : 'Data pelanggan.'}
        action={
          canOperate ? (
            <Link
              to="/customers/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" /> Tambah Pelanggan
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, telepon, atau email"
        />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Belum ada pelanggan"
          description="Tambahkan pelanggan untuk menyimpan catatan dan riwayat pesanan."
          action={
            canOperate ? (
              <Link
                to="/customers/new"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Tambah Pelanggan
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <Table headers={['Nama', 'Telepon', 'Email', 'Catatan', 'Aksi']}>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{customer.name}</td>
                <td className="px-3 py-2 text-gray-500">{customer.phone || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{customer.email || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{customer.note || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(customer)}>
                      Riwayat
                    </Button>
                    {canOperate && (
                      <Link
                        to="/customers/$id/edit"
                        params={{ id: String(customer.id) }}
                        aria-label="Edit pelanggan"
                        className="inline-flex items-center rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Hapus pelanggan"
                        onClick={() => setToDelete(customer)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <InfiniteScrollSentinel
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            loadedCount={customers.length}
            total={totalCustomers}
          />
        </Card>
      )}

      <div className="mt-6">
        <Card
          title={selected ? `Riwayat Pesanan · ${selected.name}` : 'Riwayat Pesanan'}
          action={
            selected ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(null)}>
                Tampilkan semua pelanggan
              </Button>
            ) : undefined
          }
        >
          {selected ? (
            rows.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada pesanan untuk pelanggan ini.</p>
            ) : (
              <Table headers={['Nomor', 'Tanggal', 'Total', 'Pembayaran', 'Aksi']}>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-3 py-2 text-gray-500">{formatDateTime(order.created_at)}</td>
                    <td className="px-3 py-2">{formatCurrency(order.total_amount)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={PAYMENT_STATUS_TONES[order.payment_status]}>{order.payment_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setReceiptOrder(order)}>
                        Struk
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )
          ) : (
            <p className="text-sm text-gray-500">Pilih pelanggan untuk melihat riwayat pesanan.</p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus pelanggan"
        description={toDelete ? `Hapus pelanggan ${toDelete.name}?` : undefined}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

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
