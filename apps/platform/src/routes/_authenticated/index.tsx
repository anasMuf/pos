import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, BarChart3, Boxes, Clock, Receipt, Store, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../features/app/AppContext';
import { useCashShifts, useOrders, useProducts } from '../../api/queries';
import { Badge, Card, EmptyState, PageHeader, StatCard } from '../../components/molecules/ui';
import { formatCurrency, formatDateTime } from '../../lib/format';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { activeOutlet, activeOutletId, effectiveMode, pendingSyncCount, outlets, canManage, canOperate } = useApp();
  const { data: shifts = [] } = useCashShifts(activeOutletId ?? undefined);
  const { data: products = [] } = useProducts(activeOutletId ?? undefined);
  const { data: orders = [] } = useOrders({ outlet_id: activeOutletId ?? undefined });

  const openShift = shifts.find((shift) => shift.status === 'open');
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === today);
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const lowStock = products.filter(
    (product) => product.track_inventory && product.stock_qty <= product.min_stock_qty,
  );
  const unpaidOrders = orders.filter((order) => order.payment_status !== 'paid');

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ringkasan operasional outlet Anda." />
        <EmptyState
          title="Belum ada outlet"
          description="Buat tenant dan outlet pertama untuk mulai menggunakan POS."
          action={
            <Link
              to="/outlets/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
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
        title="Dashboard"
        description={activeOutlet ? `Ringkasan ${activeOutlet.name}` : 'Ringkasan operasional outlet.'}
        action={
          canOperate ? (
            <Link
              to="/pos"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Buka Kasir
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Status Shift"
          value={openShift ? 'Terbuka' : 'Tertutup'}
          hint={openShift ? `Kas awal ${formatCurrency(openShift.opening_cash)}` : 'Buka shift sebelum transaksi'}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Pesanan Hari Ini"
          value={String(todayOrders.length)}
          hint={`Total ${formatCurrency(revenueToday)}`}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          label="Mode Koneksi"
          value={effectiveMode === 'online' ? 'Online' : 'Offline'}
          hint={pendingSyncCount > 0 ? `${pendingSyncCount} transaksi menunggu sync` : 'Antrean sinkronisasi kosong'}
          icon={effectiveMode === 'online' ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        />
        <StatCard
          label="Stok Menipis"
          value={String(lowStock.length)}
          hint={`${products.length} produk terdaftar`}
          icon={<Boxes className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Pesanan Terbaru">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada pesanan untuk outlet ini.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {order.customer_name || 'Walk-in'} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={order.payment_status === 'paid' ? 'green' : order.payment_status === 'partial' ? 'yellow' : 'red'}>
                      {order.payment_status}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Perlu Perhatian">
          <div className="space-y-3">
            {openShift === undefined && (
              <p className="text-sm text-gray-500">Tidak ada shift terbuka. Buka shift di halaman Shift.</p>
            )}
            {unpaidOrders.length > 0 && (
              <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{unpaidOrders.length} pesanan belum lunas. Tinjau di halaman Pesanan.</p>
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="flex items-start gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <Boxes className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {lowStock.length} produk di bawah stok minimum:{' '}
                  {lowStock.slice(0, 3).map((p) => p.name).join(', ')}
                  {lowStock.length > 3 ? ', ...' : ''}
                </p>
              </div>
            )}
            {unpaidOrders.length === 0 && lowStock.length === 0 && (
              <p className="text-sm text-gray-500">Tidak ada peringatan. Operasional berjalan normal.</p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <QuickLink to="/orders" label="Kelola Pesanan" icon={<Receipt className="h-4 w-4" />} />
            <QuickLink to="/inventory" label="Cek Stok" icon={<Boxes className="h-4 w-4" />} />
            {canManage && (
              <QuickLink to="/reports" label="Lihat Laporan" icon={<BarChart3 className="h-4 w-4" />} />
            )}
            <QuickLink to="/products" label="Katalog Produk" icon={<Store className="h-4 w-4" />} />
            {canManage && (
              <QuickLink to="/outlets" label="Pengaturan Outlet" icon={<Store className="h-4 w-4" />} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: '/' | '/orders' | '/inventory' | '/products' | '/outlets' | '/reports'; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {icon}
      {label}
    </Link>
  );
}
