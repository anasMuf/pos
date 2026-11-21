import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useDeleteVariant, useProduct, useVariants } from '../../api/queries';
import type { ProductVariant } from '../../api/types';
import { AccessDenied, Card, PageHeader, Spinner, Table } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useToast } from '../../components/molecules/Toast';
import { formatCurrency, formatNumber } from '../../lib/format';

export function VariantListPage({ productId }: { productId: number }) {
  const { canManage } = useApp();
  const { addToast } = useToast();
  const { data: product, isLoading } = useProduct(productId);
  const { data: variants = [] } = useVariants(productId);
  const deleteVariant = useDeleteVariant(productId);
  const [toDelete, setToDelete] = useState<ProductVariant | null>(null);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Varian" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah varian." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteVariant.mutateAsync(toDelete.id);
      addToast({ variant: 'success', title: 'Varian dihapus', message: toDelete.name });
      setToDelete(null);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menghapus varian',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`Varian${product ? ` · ${product.name}` : ''}`}
        description="Kelola varian produk beserta SKU, harga khusus, dan stok."
        action={
          <div className="flex gap-2">
            <Link
              to="/products/$id/edit"
              params={{ id: String(productId) }}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Produk
            </Link>
            <Link
              to="/products/$id/variants/new"
              params={{ id: String(productId) }}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" /> Tambah Varian
            </Link>
          </div>
        }
      />

      <Card>
        {variants.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada varian untuk produk ini.</p>
        ) : (
          <Table headers={['Nama', 'SKU', 'Barcode', 'Harga', 'Stok', 'Aksi']}>
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{variant.name}</td>
                <td className="px-3 py-2 text-gray-500">{variant.sku}</td>
                <td className="px-3 py-2 text-gray-500">{variant.barcode || '—'}</td>
                <td className="px-3 py-2">
                  {variant.price_override > 0 ? formatCurrency(variant.price_override) : '—'}
                </td>
                <td className="px-3 py-2">{formatNumber(variant.stock_qty)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link
                      to="/products/$id/variants/$variantId/edit"
                      params={{ id: String(productId), variantId: String(variant.id) }}
                      aria-label="Edit varian"
                      className="inline-flex items-center rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Hapus varian"
                      onClick={() => setToDelete(variant)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus varian"
        description={toDelete ? `Hapus varian ${toDelete.name}?` : undefined}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
