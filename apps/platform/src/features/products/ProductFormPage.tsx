import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateProduct, useProduct, useUpdateProduct } from '../../api/queries';
import type { CommissionType, PricingType } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

const textareaClass =
  'block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 font-mono';

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: '',
  pricing_type: 'fixed' as PricingType,
  base_price: '',
  track_inventory: true,
  stock_qty: '0',
  min_stock_qty: '0',
  pricing_rules: '{}',
  modifiers_config: '[]',
  commission_type: 'none' as CommissionType,
  commission_value: '0',
};

export function ProductFormPage({ productId }: { productId?: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeOutletId, activeOutlet, canManage } = useApp();
  const { data: product, isLoading, isError } = useProduct(productId ?? null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      pricing_type: product.pricing_type,
      base_price: String(product.base_price),
      track_inventory: product.track_inventory,
      stock_qty: String(product.stock_qty),
      min_stock_qty: String(product.min_stock_qty),
      pricing_rules: JSON.stringify(product.pricing_rules ?? {}),
      modifiers_config: JSON.stringify(product.modifiers_config ?? []),
      commission_type: product.commission_type ?? 'none',
      commission_value: String(product.commission_value ?? 0),
    });
  }, [product]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title={productId ? 'Edit Produk' : 'Produk Baru'} />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah katalog." />
      </div>
    );
  }

  if (productId && isLoading) return <Spinner />;
  if (productId && (isError || !product)) {
    return (
      <div>
        <PageHeader title="Edit Produk" />
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

  const handleSubmit = async () => {
    if (!form.name || !form.sku || !form.category) {
      addToast({ variant: 'error', title: 'Data belum lengkap', message: 'Nama, SKU, dan kategori wajib diisi.' });
      return;
    }
    if (!productId && !activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }

    let pricingRules: Record<string, unknown> = {};
    let modifiersConfig: unknown[] = [];
    try {
      pricingRules = JSON.parse(form.pricing_rules || '{}');
      const parsedModifiers = JSON.parse(form.modifiers_config || '[]');
      if (!Array.isArray(parsedModifiers)) throw new Error('modifiers harus array');
      modifiersConfig = parsedModifiers;
    } catch {
      addToast({ variant: 'error', title: 'JSON tidak valid', message: 'Periksa format pricing rules / modifiers.' });
      return;
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      pricing_type: form.pricing_type,
      base_price: Number(form.base_price) || 0,
      track_inventory: form.track_inventory,
      min_stock_qty: Number(form.min_stock_qty) || 0,
      pricing_rules: pricingRules,
      modifiers_config: modifiersConfig as Record<string, unknown>[],
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value) || 0,
    };

    try {
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, ...payload });
        addToast({ variant: 'success', title: 'Produk diperbarui', message: form.name });
      } else {
        await createProduct.mutateAsync({
          outlet_id: activeOutletId as number,
          ...payload,
          stock_qty: Number(form.stock_qty) || 0,
        });
        addToast({ variant: 'success', title: 'Produk ditambahkan', message: form.name });
      }
      navigate({ to: '/products' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: productId ? 'Gagal memperbarui produk' : 'Gagal menambah produk',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  const saving = createProduct.isPending || updateProduct.isPending;
  const showCommission = !!activeOutlet?.capabilities.enable_staff_commission;

  return (
    <div>
      <PageHeader
        title={productId ? `Edit Produk${product ? ` · ${product.name}` : ''}` : 'Produk Baru'}
        description={activeOutlet ? `Katalog ${activeOutlet.name}` : 'Katalog produk.'}
        action={
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="product-name">Nama</Label>
            <Input
              id="product-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="product-category">Kategori</Label>
            <Input
              id="product-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="product-pricing">Tipe Harga</Label>
            <Select
              id="product-pricing"
              value={form.pricing_type}
              onChange={(event) => setForm({ ...form, pricing_type: event.target.value as PricingType })}
              className="mt-1"
            >
              <option value="fixed">Fixed</option>
              <option value="dimension">Dimension</option>
              <option value="tiered">Tiered</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="product-base-price">Harga Dasar</Label>
            <Input
              id="product-base-price"
              type="number"
              min={0}
              value={form.base_price}
              onChange={(event) => setForm({ ...form, base_price: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="product-stock">Stok</Label>
            <Input
              id="product-stock"
              type="number"
              value={form.stock_qty}
              onChange={(event) => setForm({ ...form, stock_qty: event.target.value })}
              disabled={!!productId}
              className="mt-1"
            />
            {productId && <p className="mt-1 text-xs text-gray-500">Ubah stok lewat halaman Inventori.</p>}
          </div>
          <div>
            <Label htmlFor="product-min-stock">Stok Minimum</Label>
            <Input
              id="product-min-stock"
              type="number"
              value={form.min_stock_qty}
              onChange={(event) => setForm({ ...form, min_stock_qty: event.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="product-track"
              type="checkbox"
              checked={form.track_inventory}
              onChange={(event) => setForm({ ...form, track_inventory: event.target.checked })}
            />
            <Label htmlFor="product-track">Lacak stok</Label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="product-rules">Pricing Rules (JSON)</Label>
            <textarea
              id="product-rules"
              value={form.pricing_rules}
              onChange={(event) => setForm({ ...form, pricing_rules: event.target.value })}
              rows={2}
              className={`mt-1 ${textareaClass}`}
              placeholder='Contoh dimension: {"unit":"m","min_area":1} / tiered: {"tiers":[...]}'
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="product-modifiers">Modifiers (JSON array)</Label>
            <textarea
              id="product-modifiers"
              value={form.modifiers_config}
              onChange={(event) => setForm({ ...form, modifiers_config: event.target.value })}
              rows={2}
              className={`mt-1 ${textareaClass}`}
              placeholder='[{"name":"Mata Ayam","price":2000}]'
            />
          </div>
          {showCommission && (
            <>
              <div>
                <Label htmlFor="product-commission-type">Tipe Komisi</Label>
                <Select
                  id="product-commission-type"
                  value={form.commission_type}
                  onChange={(event) =>
                    setForm({ ...form, commission_type: event.target.value as CommissionType })
                  }
                  className="mt-1"
                >
                  <option value="none">Tanpa komisi</option>
                  <option value="percent">Persen dari subtotal</option>
                  <option value="fixed">Nominal per unit</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="product-commission-value">Nilai Komisi</Label>
                <Input
                  id="product-commission-value"
                  type="number"
                  min={0}
                  value={form.commission_value}
                  onChange={(event) => setForm({ ...form, commission_value: event.target.value })}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {form.commission_type === 'percent'
                    ? 'Contoh: 2 → 2% dari subtotal item'
                    : 'Contoh: 1000 → Rp1.000 per unit terjual'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : productId ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
          {productId && (
            <Link
              to="/products/$id/variants"
              params={{ id: String(productId) }}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Kelola Varian
            </Link>
          )}
          <Link
            to="/products"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </Card>
    </div>
  );
}
