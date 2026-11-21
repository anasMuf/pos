import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useDeleteProduct, useInfiniteProducts } from '../../api/queries';
import type { Product } from '../../api/types';
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
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useToast } from '../../components/molecules/Toast';
import { formatCurrency, formatNumber } from '../../lib/format';

export function ProductsPage() {
  const { activeOutletId, activeOutlet, outlets, canManage } = useApp();
  const { addToast } = useToast();
  const {
    data: productPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(activeOutletId ?? undefined);
  const products = productPages?.pages.flatMap((page) => page.items) ?? [];
  const totalProducts = productPages?.pages[0]?.meta.total;
  const deleteProduct = useDeleteProduct();
  const [toDelete, setToDelete] = useState<Product | null>(null);

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Produk" description="Katalog produk dan aturan harga." />
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
      await deleteProduct.mutateAsync(toDelete.id);
      addToast({ variant: 'success', title: 'Produk dihapus', message: toDelete.name });
      setToDelete(null);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menghapus produk',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Produk"
        description={activeOutlet ? `Katalog ${activeOutlet.name}` : 'Katalog produk.'}
        action={
          canManage ? (
            <Link
              to="/products/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" />
              Tambah Produk
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          description="Tambahkan produk pertama untuk outlet ini."
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
        <Card>
          <Table
            headers={
              canManage
                ? ['Produk', 'SKU', 'Kategori', 'Tipe Harga', 'Harga', 'Stok', 'Aksi']
                : ['Produk', 'SKU', 'Kategori', 'Tipe Harga', 'Harga', 'Stok']
            }
          >
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                <td className="px-3 py-2 text-gray-500">{product.sku}</td>
                <td className="px-3 py-2 text-gray-500">{product.category}</td>
                <td className="px-3 py-2">
                  <Badge tone="indigo">{product.pricing_type}</Badge>
                </td>
                <td className="px-3 py-2">{formatCurrency(product.base_price)}</td>
                <td className="px-3 py-2">{formatNumber(product.stock_qty)}</td>
                {canManage && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        to="/products/$id/edit"
                        params={{ id: String(product.id) }}
                        aria-label="Edit produk"
                        className="inline-flex items-center rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/products/$id/variants"
                        params={{ id: String(product.id) }}
                        className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        <Layers className="mr-1 h-3.5 w-3.5" /> Varian
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Hapus produk"
                        onClick={() => setToDelete(product)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
          <InfiniteScrollSentinel
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            loadedCount={products.length}
            total={totalProducts}
          />
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus produk"
        description={toDelete ? `Hapus produk ${toDelete.name}?` : undefined}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
