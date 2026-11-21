import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../app/AppContext';
import { Badge, Card, PageHeader, Table } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { useToast } from '../../components/molecules/Toast';
import { formatCurrency } from '../../lib/format';

export function SettingsPage() {
  const { user } = useAuth();
  const {
    activeOutlet,
    mode,
    effectiveMode,
    isConnected,
    checkConnection,
    setMode,
    pendingSyncCount,
    pendingOrders,
    failedSyncIds,
    isSyncing,
    syncNow,
    retryOrder,
  } = useApp();
  const { addToast } = useToast();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleSync = async () => {
    const result = await syncNow();
    if (result.failed) {
      addToast({
        variant: 'error',
        title: 'Sebagian transaksi gagal',
        message: `${result.failedCount} transaksi tetap di antrean. Coba retry per transaksi.`,
      });
    } else {
      addToast({ variant: 'success', title: 'Sinkronisasi selesai', message: `${result.synced} transaksi diproses.` });
    }
  };

  const handleRetry = async (clientSyncId: string) => {
    setRetryingId(clientSyncId);
    const ok = await retryOrder(clientSyncId);
    setRetryingId(null);
    addToast(
      ok
        ? { variant: 'success', title: 'Transaksi tersinkronisasi', message: clientSyncId }
        : { variant: 'error', title: 'Retry gagal', message: 'Periksa koneksi atau data transaksi.' },
    );
  };

  return (
    <div>
      <PageHeader title="Pengaturan" description="Preferensi akun dan koneksi aplikasi." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Akun">
          <dl className="divide-y divide-gray-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Nama</dt>
              <dd className="font-medium text-gray-900">{user?.full_name}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Username</dt>
              <dd className="font-medium text-gray-900">{user?.username}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{user?.email}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Telepon</dt>
              <dd className="font-medium text-gray-900">{user?.phone}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Role</dt>
              <dd>
                <Badge tone="indigo">{user?.role}</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Koneksi & Sinkronisasi">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Mode koneksi</p>
                <p className="text-xs text-gray-500">Online mengirim transaksi langsung ke server.</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'online' ? 'primary' : 'secondary'}
                  onClick={() => setMode('online')}
                >
                  Online
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'offline' ? 'danger' : 'secondary'}
                  onClick={() => setMode('offline')}
                >
                  Offline
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Mode efektif: <span className="font-medium text-gray-900">{effectiveMode}</span> ·{' '}
              {isConnected ? 'terhubung ke server' : 'server tidak terjangkau'}
            </p>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Status koneksi</p>
                <p className="text-xs text-gray-500">{isConnected ? 'Terhubung' : 'Tidak terhubung'}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const ok = await checkConnection();
                  addToast({
                    variant: ok ? 'success' : 'warning',
                    title: ok ? 'Terhubung' : 'Masih offline',
                    message: ok ? 'Server dapat dijangkau.' : 'Server belum dapat dijangkau.',
                  });
                }}
              >
                Cek koneksi
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Antrean sinkronisasi</p>
                <p className="text-xs text-gray-500">
                  {pendingSyncCount} transaksi menunggu dikirim
                  {failedSyncIds.length > 0 ? ` · ${failedSyncIds.length} gagal` : ''}.
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleSync} disabled={isSyncing || pendingSyncCount === 0}>
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Outlet aktif</p>
                <p className="text-xs text-gray-500">{activeOutlet?.name ?? 'Belum dipilih'}</p>
              </div>
              {activeOutlet && (
                <Badge tone={activeOutlet.default_connection_mode === 'online' ? 'blue' : 'yellow'}>
                  {activeOutlet.default_connection_mode}
                </Badge>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">
                Konflik diselesaikan di server. Transaksi yang sudah pernah dikirim dihitung sebagai duplikat
                (tidak digabung) melalui <span className="font-medium text-gray-700">client_sync_id</span>, sehingga
                retry tidak menghasilkan transaksi ganda.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Antrean Offline" className="lg:col-span-2">
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada transaksi menunggu sinkronisasi.</p>
          ) : (
            <Table headers={['Referensi', 'Pelanggan', 'Total', 'Status', 'Aksi']}>
              {pendingOrders.map((order) => {
                const subtotal = order.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
                const discount = Math.min(
                  subtotal,
                  (subtotal * (order.discount_percent ?? 0)) / 100 + (order.discount_amount ?? 0),
                );
                const taxable = subtotal - discount;
                const total = taxable + (taxable * (order.tax_percent ?? 0)) / 100;
                const failed = failedSyncIds.includes(order.client_sync_id);
                return (
                  <tr key={order.client_sync_id}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{order.client_sync_id}</td>
                    <td className="px-3 py-2 text-gray-600">{order.customer_name || 'Walk-in'}</td>
                    <td className="px-3 py-2">{formatCurrency(total)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={failed ? 'red' : 'yellow'}>{failed ? 'gagal' : 'menunggu'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!isConnected || isSyncing || retryingId === order.client_sync_id}
                        onClick={() => handleRetry(order.client_sync_id)}
                      >
                        {retryingId === order.client_sync_id ? 'Mengirim...' : 'Retry'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card title="Tentang Aplikasi" className="lg:col-span-2">
          <p className="text-sm text-gray-600">
            Universal Multi-Capability POS — template POS multi-tenant & multi-outlet dengan capability flag,
            harga fleksibel, alur pesanan, pembayaran bertahap, dan mode offline dengan sinkronisasi idempotent.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gray">Go + Echo</Badge>
            <Badge tone="gray">PostgreSQL</Badge>
            <Badge tone="gray">React + TanStack</Badge>
            <Badge tone="gray">Tailwind CSS</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
