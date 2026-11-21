import { Link } from '@tanstack/react-router';
import { Boxes, Plus } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useProducts, useStockMovements } from '../../api/queries';
import { Badge, Card, EmptyState, PageHeader, StatCard, Table } from '../../components/molecules/ui';
import { formatDateTime, formatNumber } from '../../lib/format';
import { MOVEMENT_TYPE_LABELS } from '../../lib/constants';

export function InventoryPage() {
  const { activeOutletId, activeOutlet, outlets, canManage } = useApp();
  const { data: products = [] } = useProducts(activeOutletId ?? undefined);
  const { data: movements = [] } = useStockMovements(activeOutletId ?? undefined);

  const lowStock = products.filter((product) => product.track_inventory && product.stock_qty <= product.min_stock_qty);

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Inventori" description="Manajemen stok dan mutasi." />
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
        title="Inventori"
        description={activeOutlet ? `Stok dan mutasi untuk ${activeOutlet.name}` : 'Kelola stok outlet.'}
        action={
          canManage ? (
            <Link
              to="/inventory/new"
              search={{ product_id: undefined, variant_id: undefined }}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" /> Catat Mutasi
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Produk Terdaftar" value={String(products.length)} icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Stok Menipis" value={String(lowStock.length)} hint="≤ stok minimum" />
        <StatCard label="Mutasi Tercatat" value={String(movements.length)} />
      </div>

      <div className="mt-6">
        <Card title="Daftar Stok Produk">
          {products.length === 0 ? (
            <EmptyState
              title="Belum ada produk"
              description="Tambahkan produk terlebih dahulu di halaman Produk."
              action={
                canManage ? (
                  <Link
                    to="/products/new"
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Tambah Produk
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <Table headers={['Produk', 'SKU', 'Stok', 'Min', 'Status']}>
              {products.map((product) => {
                const low = product.track_inventory && product.stock_qty <= product.min_stock_qty;
                return (
                  <tr key={product.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                    <td className="px-3 py-2 text-gray-500">{product.sku}</td>
                    <td className="px-3 py-2">{formatNumber(product.stock_qty)}</td>
                    <td className="px-3 py-2 text-gray-500">{formatNumber(product.min_stock_qty)}</td>
                    <td className="px-3 py-2">
                      {!product.track_inventory ? (
                        <Badge tone="gray">tidak dilacak</Badge>
                      ) : low ? (
                        <Badge tone="red">menipis</Badge>
                      ) : (
                        <Badge tone="green">aman</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Riwayat Mutasi Stok">
          {movements.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada mutasi stok.</p>
          ) : (
            <Table headers={['Waktu', 'Produk', 'Jenis', 'Perubahan', 'Referensi', 'Catatan']}>
              {movements.map((movement) => {
                const product = products.find((item) => item.id === movement.product_id);
                return (
                  <tr key={movement.id}>
                    <td className="px-3 py-2 text-gray-500">{formatDateTime(movement.created_at)}</td>
                    <td className="px-3 py-2">{product?.name ?? `#${movement.product_id}`}</td>
                    <td className="px-3 py-2">
                      <Badge tone={movement.movement_type === 'sale' ? 'indigo' : 'gray'}>
                        {MOVEMENT_TYPE_LABELS[movement.movement_type] ?? movement.movement_type}
                      </Badge>
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        movement.qty_change < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {movement.qty_change > 0 ? '+' : ''}
                      {formatNumber(movement.qty_change)}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {movement.reference_type}
                      {movement.reference_id ? ` · ${movement.reference_id}` : ''}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{movement.note || '—'}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
