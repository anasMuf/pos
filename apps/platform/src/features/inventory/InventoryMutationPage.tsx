import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateStockMovement, useProducts, useVariants } from '../../api/queries';
import type { MovementType } from '../../api/types';
import { AccessDenied, Card, PageHeader } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { FieldError } from '../../components/atoms/FieldError';

const MANUAL_TYPES: { value: MovementType; label: string }[] = [
  { value: 'stock_in', label: 'Stok Masuk' },
  { value: 'stock_out', label: 'Stok Keluar' },
  { value: 'adjustment', label: 'Penyesuaian / Opname' },
];

export function InventoryMutationPage({
  initialProductId,
  initialVariantId,
}: {
  initialProductId?: number;
  initialVariantId?: number;
} = {}) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeOutletId, activeOutlet, canManage } = useApp();
  const { data: products = [] } = useProducts(activeOutletId ?? undefined);
  const createMovement = useCreateStockMovement();

  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '');
  const [variantId, setVariantId] = useState(initialVariantId ? String(initialVariantId) : '');
  const [movementType, setMovementType] = useState<MovementType>('stock_in');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ product?: string; qty?: string }>({});

  const selectedProduct = products.find((product) => product.id === Number(productId));
  const { data: variants = [] } = useVariants(productId ? Number(productId) : null);
  const selectedVariant = variants.find((variant) => variant.id === Number(variantId));
  const currentStock = selectedVariant ? selectedVariant.stock_qty : (selectedProduct?.stock_qty ?? 0);
  const parsedQty = Number(qty) || 0;
  const delta =
    movementType === 'stock_out' ? -Math.abs(parsedQty) : movementType === 'adjustment' ? parsedQty : Math.abs(parsedQty);
  const nextStock = currentStock + delta;
  const negativeStock = parsedQty !== 0 && nextStock < 0;

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Catat Mutasi Stok" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mencatat mutasi stok." />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }
    const parsedQty = Number(qty);
    const next: { product?: string; qty?: string } = {};
    if (!productId) next.product = 'Pilih produk terlebih dahulu.';
    if (!parsedQty) next.qty = 'Jumlah mutasi wajib diisi.';
    if (negativeStock) next.qty = 'Stok akhir tidak boleh negatif.';
    setErrors(next);
    if (next.product) {
      document.getElementById('movement-product')?.focus();
      return;
    }
    if (next.qty) {
      document.getElementById('movement-qty')?.focus();
      return;
    }
    const delta =
      movementType === 'stock_out'
        ? -Math.abs(parsedQty)
        : movementType === 'adjustment'
          ? parsedQty
          : Math.abs(parsedQty);

    try {
      await createMovement.mutateAsync({
        outlet_id: activeOutletId,
        product_id: Number(productId),
        variant_id: variantId ? Number(variantId) : undefined,
        movement_type: movementType,
        qty_change: delta,
        reference_type: 'manual',
        note,
      });
      addToast({ variant: 'success', title: 'Mutasi stok tersimpan', message: 'Jumlah stok telah diperbarui.' });
      navigate({ to: '/inventory' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menyimpan mutasi',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Catat Mutasi Stok"
        description={activeOutlet ? `Stok untuk ${activeOutlet.name}` : 'Kelola stok outlet.'}
        action={
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="movement-product">Produk</Label>
            <Select
              id="movement-product"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                setVariantId('');
                setErrors({});
              }}
              className="mt-1"
              aria-invalid={!!errors.product}
              aria-describedby={errors.product ? 'movement-product-error' : undefined}
            >
              <option value="">Pilih produk</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>
            <FieldError id="movement-product-error" message={errors.product} />
          </div>
          {variants.length > 0 && (
            <div>
              <Label htmlFor="movement-variant">Varian</Label>
              <Select
                id="movement-variant"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                className="mt-1"
              >
                <option value="">Tanpa varian (stok utama)</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} · {variant.sku} (stok {variant.stock_qty})
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="movement-type">Jenis Mutasi</Label>
            <Select
              id="movement-type"
              value={movementType}
              onChange={(event) => setMovementType(event.target.value as MovementType)}
              className="mt-1"
            >
              {MANUAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="movement-qty">
              Jumlah {movementType === 'adjustment' ? '(boleh negatif)' : ''}
            </Label>
            <Input
              id="movement-qty"
              type="number"
              value={qty}
              onChange={(event) => {
                setQty(event.target.value);
                setErrors({});
              }}
              className="mt-1"
              aria-invalid={!!errors.qty}
              aria-describedby={errors.qty ? 'movement-qty-error' : undefined}
            />
            <FieldError id="movement-qty-error" message={errors.qty} />
          </div>
          <div>
            <Label htmlFor="movement-note">Catatan</Label>
            <Input
              id="movement-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Opsional"
              className="mt-1"
            />
          </div>
        </div>

        {selectedProduct && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm">
            <p className="text-gray-600">
              Stok saat ini: <span className="font-semibold text-gray-900">{currentStock}</span>
              {parsedQty !== 0 && (
                <>
                  {' '}
                  → setelah mutasi:{' '}
                  <span className={negativeStock ? 'font-semibold text-red-600' : 'font-semibold text-gray-900'}>
                    {nextStock}
                  </span>
                </>
              )}
            </p>
            {negativeStock && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                Stok akhir tidak boleh negatif.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={createMovement.isPending}>
            {createMovement.isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
          </Button>
          <Link
            to="/inventory"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </Card>
    </div>
  );
}
