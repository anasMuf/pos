import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateVariant, useProduct, useUpdateVariant, useVariants } from '../../api/queries';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { CurrencyInput } from '../../components/atoms/CurrencyInput';
import { NumberInput } from '../../components/atoms/NumberInput';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { FieldError } from '../../components/atoms/FieldError';
import { formatNumber } from '../../lib/format';
import { UnsavedChangesGuard, allowNextNavigation } from '../../components/molecules/UnsavedChangesGuard';

const EMPTY_FORM = { name: '', sku: '', barcode: '', price_override: '', stock_qty: '0' };

export function VariantFormPage({
  productId,
  variantId,
}: {
  productId: number;
  variantId?: number;
}) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: product, isLoading: isLoadingProduct, isError: isProductError } = useProduct(productId);
  const { data: variants = [], isLoading: isLoadingVariants, isError: isVariantsError } = useVariants(productId);
  const createVariant = useCreateVariant(productId);
  const updateVariant = useUpdateVariant(productId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: string; sku?: string; stock_qty?: string }>({});

  const variant = variantId ? variants.find((item) => item.id === variantId) : undefined;

  useEffect(() => {
    if (!variant) return;
    const next = {
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode ?? '',
      price_override: variant.price_override > 0 ? String(variant.price_override) : '',
      stock_qty: String(variant.stock_qty),
    };
    setForm(next);
    setBaseline(next);
  }, [variant]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Varian" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah varian." />
      </div>
    );
  }

  if (isLoadingProduct || (variantId && isLoadingVariants)) return <Spinner />;
  if (isProductError || !product) {
    return (
      <div>
        <PageHeader title="Varian" />
        <EmptyState
          title="Produk tidak ditemukan"
          description="Produk tidak tersedia atau Anda tidak memiliki akses ke outletnya."
          action={
            <Link to="/products" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Kembali ke Produk
            </Link>
          }
        />
      </div>
    );
  }
  if (variantId && (isVariantsError || !variant)) {
    return (
      <div>
        <PageHeader title="Edit Varian" />
        <EmptyState
          title="Varian tidak ditemukan"
          description="Varian mungkin sudah dihapus dari produk ini."
          action={
            <Link
              to="/products/$id/variants"
              params={{ id: String(productId) }}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Kembali ke Varian
            </Link>
          }
        />
      </div>
    );
  }

  const handleSubmit = async () => {
    const next: { name?: string; sku?: string; stock_qty?: string } = {};
    if (!form.name.trim()) next.name = 'Nama varian wajib diisi.';
    if (!form.sku.trim()) next.sku = 'SKU varian wajib diisi.';
    if (Number(form.stock_qty) < 0) next.stock_qty = 'Stok tidak boleh negatif.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      document.getElementById(`variant-${first === 'stock_qty' ? 'stock' : first}`)?.focus();
      return;
    }
    const basePayload = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || undefined,
      price_override: form.price_override ? Number(form.price_override) : undefined,
    };
    try {
      if (variantId) {
        // Stock on edit is read-only; adjustments go through /inventory/new.
        await updateVariant.mutateAsync({ id: variantId, ...basePayload });
        addToast({ variant: 'success', title: 'Varian diperbarui', message: form.name });
      } else {
        await createVariant.mutateAsync({ ...basePayload, stock_qty: Number(form.stock_qty) || 0 });
        addToast({ variant: 'success', title: 'Varian ditambahkan', message: form.name });
      }
      setBaseline(form);
      allowNextNavigation();
      navigate({ to: '/products/$id/variants', params: { id: String(productId) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: variantId ? 'Gagal memperbarui varian' : 'Gagal menambah varian',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  const saving = createVariant.isPending || updateVariant.isPending;

  return (
    <div>
      <PageHeader
        title={variantId ? `Edit Varian${variant ? ` · ${variant.name}` : ''}` : 'Varian Baru'}
        description={product ? `Produk ${product.name} · ${product.sku}` : undefined}
        action={
          <Link
            to="/products/$id/variants"
            params={{ id: String(productId) }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="variant-name">Nama</Label>
            <Input
              id="variant-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'variant-name-error' : undefined}
            />
            <FieldError id="variant-name-error" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="variant-sku">SKU</Label>
            <Input
              id="variant-sku"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              className="mt-1"
              aria-invalid={!!errors.sku}
              aria-describedby={errors.sku ? 'variant-sku-error' : undefined}
            />
            <FieldError id="variant-sku-error" message={errors.sku} />
          </div>
          <div>
            <Label htmlFor="variant-barcode">Barcode</Label>
            <Input
              id="variant-barcode"
              value={form.barcode}
              onChange={(event) => setForm({ ...form, barcode: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="variant-price">Harga Khusus</Label>
            <CurrencyInput
              id="variant-price"
              value={form.price_override}
              onChange={(value) => setForm({ ...form, price_override: value })}
              className="mt-1"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">Kosongkan untuk memakai harga produk.</p>
          </div>
          <div>
            <Label htmlFor="variant-stock">Stok</Label>
            {variantId ? (
              <>
                <p id="variant-stock" className="mt-2 text-sm text-gray-900">
                  {variant ? formatNumber(variant.stock_qty) : '—'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Perubahan stok dicatat lewat mutasi agar ada jejak audit.{' '}
                  <Link
                    to="/inventory/new"
                    search={{ product_id: productId, variant_id: variantId }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Catat mutasi stok
                  </Link>
                </p>
              </>
            ) : (
              <>
                <NumberInput
                  id="variant-stock"
                  value={form.stock_qty}
                  onChange={(value) => setForm({ ...form, stock_qty: value })}
                  min={0}
                  decimals={2}
                  showStepper
                  className="mt-1"
                  aria-invalid={!!errors.stock_qty}
                  aria-describedby={errors.stock_qty ? 'variant-stock-error' : undefined}
                />
                <FieldError id="variant-stock-error" message={errors.stock_qty} />
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : variantId ? 'Simpan Perubahan' : 'Simpan Varian'}
          </Button>
          <Link
            to="/products/$id/variants"
            params={{ id: String(productId) }}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </Card>

      <UnsavedChangesGuard isDirty={isDirty} />
    </div>
  );
}
