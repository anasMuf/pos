import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateProduct, useProduct, useProducts, useUpdateProduct } from '../../api/queries';
import type { CommissionType, PricingType } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { CurrencyInput } from '../../components/atoms/CurrencyInput';
import { NumberInput } from '../../components/atoms/NumberInput';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { newClientId } from '../../lib/format';
import { UnsavedChangesGuard, allowNextNavigation } from '../../components/molecules/UnsavedChangesGuard';

interface TierRow {
  id: string;
  min_qty: string;
  max_qty: string;
  price: string;
}

interface ModifierRow {
  id: string;
  name: string;
  price: string;
}

interface ProductFormState {
  name: string;
  sku: string;
  category: string;
  pricing_type: PricingType;
  base_price: string;
  track_inventory: boolean;
  stock_qty: string;
  min_stock_qty: string;
  dimension_unit: string;
  min_area: string;
  tiers: TierRow[];
  modifiers: ModifierRow[];
  commission_type: CommissionType;
  commission_value: string;
}

interface FormErrors {
  name?: string;
  sku?: string;
  category?: string;
  tiers?: string;
  modifiers?: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  pricing_type: 'fixed',
  base_price: '',
  track_inventory: true,
  stock_qty: '0',
  min_stock_qty: '0',
  dimension_unit: 'm',
  min_area: '1',
  tiers: [],
  modifiers: [],
  commission_type: 'none',
  commission_value: '0',
};

function parseProductForm(product: NonNullable<ReturnType<typeof useProduct>['data']>): ProductFormState {
  const rules = (product.pricing_rules ?? {}) as {
    unit?: string;
    min_area?: number;
    tiers?: { min_qty?: number; max_qty?: number; price?: number }[];
  };
  const modifiers = Array.isArray(product.modifiers_config)
    ? (product.modifiers_config as { name?: string; price?: number }[])
    : [];
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    pricing_type: product.pricing_type,
    base_price: String(product.base_price),
    track_inventory: product.track_inventory,
    stock_qty: String(product.stock_qty),
    min_stock_qty: String(product.min_stock_qty),
    dimension_unit: rules.unit ?? 'm',
    min_area: String(rules.min_area ?? 1),
    tiers: (rules.tiers ?? []).map((tier) => ({
      id: newClientId('tier'),
      min_qty: String(tier.min_qty ?? ''),
      max_qty: String(tier.max_qty ?? ''),
      price: String(tier.price ?? ''),
    })),
    modifiers: modifiers.map((modifier) => ({
      id: newClientId('mod'),
      name: modifier.name ?? '',
      price: String(modifier.price ?? ''),
    })),
    commission_type: product.commission_type ?? 'none',
    commission_value: String(product.commission_value ?? 0),
  };
}

export function ProductFormPage({ productId }: { productId?: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeOutletId, activeOutlet, canManage } = useApp();
  const { data: product, isLoading, isError } = useProduct(productId ?? null);
  const { data: outletProducts = [] } = useProducts(activeOutletId ?? undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<ProductFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of outletProducts) {
      const value = item.category.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (!options.has(key)) options.set(key, value);
    }
    const current = form.category.trim();
    if (current && !options.has(current.toLowerCase())) options.set(current.toLowerCase(), current);
    return [...options.values()].sort((a, b) => a.localeCompare(b));
  }, [outletProducts, form.category]);

  useEffect(() => {
    if (!product) return;
    const parsed = parseProductForm(product);
    setForm(parsed);
    setBaseline(parsed);
  }, [product]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

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

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = () => {
    const next: FormErrors = {};
    if (form.name.trim().length < 2) next.name = 'Nama produk minimal 2 karakter.';
    if (!form.sku.trim()) next.sku = 'SKU wajib diisi.';
    if (!form.category.trim()) next.category = 'Kategori wajib diisi.';

    if (form.pricing_type === 'tiered') {
      if (form.tiers.length === 0) {
        next.tiers = 'Tambahkan minimal satu tier harga.';
      } else {
        const invalid = form.tiers.some((tier) => {
          const min = Number(tier.min_qty);
          const max = Number(tier.max_qty);
          const price = Number(tier.price);
          return !min || !max || max < min || Number.isNaN(price) || price < 0;
        });
        if (invalid) next.tiers = 'Periksa min qty, max qty, dan harga tier.';
      }
    }

    const invalidModifier = form.modifiers.some(
      (modifier) => (modifier.name.trim() || modifier.price) && (!modifier.name.trim() || Number(modifier.price) < 0),
    );
    if (invalidModifier) next.modifiers = 'Nama modifier wajib diisi dan harga tidak boleh negatif.';

    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) document.getElementById(`product-${firstInvalid}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!productId && !activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }

    let pricingRules: Record<string, unknown> = {};
    if (form.pricing_type === 'dimension') {
      pricingRules = { unit: form.dimension_unit || 'm', min_area: Number(form.min_area) || 0 };
    } else if (form.pricing_type === 'tiered') {
      pricingRules = {
        tiers: form.tiers.map((tier) => ({
          min_qty: Number(tier.min_qty),
          max_qty: Number(tier.max_qty),
          price: Number(tier.price),
        })),
      };
    }
    const modifiers = form.modifiers
      .filter((modifier) => modifier.name.trim())
      .map((modifier) => ({ name: modifier.name.trim(), price: Number(modifier.price) || 0 }));

    const normalizedCategory = form.category.trim().replace(/\s+/g, ' ');
    const existingCategory = outletProducts.find(
      (item) => item.category.trim().toLowerCase() === normalizedCategory.toLowerCase(),
    );

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: existingCategory ? existingCategory.category.trim() : normalizedCategory,
      pricing_type: form.pricing_type,
      base_price: Number(form.base_price) || 0,
      track_inventory: form.track_inventory,
      min_stock_qty: Number(form.min_stock_qty) || 0,
      pricing_rules: pricingRules,
      modifiers_config: modifiers,
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
      setBaseline(form);
      allowNextNavigation();
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
              onChange={(event) => setField('name', event.target.value)}
              className="mt-1"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
            />
            {errors.name && (
              <p id="product-name-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              value={form.sku}
              onChange={(event) => setField('sku', event.target.value)}
              className="mt-1"
              aria-invalid={!!errors.sku}
              aria-describedby={errors.sku ? 'product-sku-error' : undefined}
            />
            {errors.sku && (
              <p id="product-sku-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.sku}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="product-category">Kategori</Label>
            <Input
              id="product-category"
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              list="product-category-options"
              autoComplete="off"
              className="mt-1"
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'product-category-error' : 'product-category-hint'}
            />
            <datalist id="product-category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <p id="product-category-hint" className="mt-1 text-xs text-gray-500">
              Pilih kategori yang sudah ada atau ketik yang baru.
            </p>
            {errors.category && (
              <p id="product-category-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.category}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="product-pricing">Tipe Harga</Label>
            <Select
              id="product-pricing"
              value={form.pricing_type}
              onChange={(event) => setField('pricing_type', event.target.value as PricingType)}
              className="mt-1"
            >
              <option value="fixed">Fixed</option>
              <option value="dimension">Dimension</option>
              <option value="tiered">Tiered</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="product-base-price">Harga Dasar</Label>
            <CurrencyInput
              id="product-base-price"
              value={form.base_price}
              onChange={(value) => setField('base_price', value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="product-stock">Stok</Label>
            <NumberInput
              id="product-stock"
              value={form.stock_qty}
              onChange={(value) => setField('stock_qty', value)}
              min={0}
              decimals={2}
              showStepper
              disabled={!!productId}
              className="mt-1"
            />
            {productId && <p className="mt-1 text-xs text-gray-500">Ubah stok lewat halaman Inventori.</p>}
          </div>
          <div>
            <Label htmlFor="product-min-stock">Stok Minimum</Label>
            <NumberInput
              id="product-min-stock"
              value={form.min_stock_qty}
              onChange={(value) => setField('min_stock_qty', value)}
              min={0}
              decimals={2}
              showStepper
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="product-track"
              type="checkbox"
              checked={form.track_inventory}
              onChange={(event) => setField('track_inventory', event.target.checked)}
            />
            <Label htmlFor="product-track">Lacak stok</Label>
          </div>
        </div>

        {form.pricing_type === 'dimension' && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Harga Dimensi</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="product-dimension-unit">Satuan</Label>
                <Input
                  id="product-dimension-unit"
                  value={form.dimension_unit}
                  onChange={(event) => setField('dimension_unit', event.target.value)}
                  className="mt-1"
                  placeholder="Tulis satuan ..."
                />
              </div>
              <div>
                <Label htmlFor="product-min-area">Minimum Area</Label>
                <NumberInput
                  id="product-min-area"
                  value={form.min_area}
                  onChange={(value) => setField('min_area', value)}
                  min={0}
                  decimals={2}
                  step={0.5}
                  showStepper
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {form.pricing_type === 'tiered' && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Tier Harga</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setField('tiers', [
                    ...form.tiers,
                    { id: newClientId('tier'), min_qty: '', max_qty: '', price: '' },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Tier
              </Button>
            </div>
            {form.tiers.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Belum ada tier. Tambahkan minimal satu tier.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {form.tiers.map((tier, index) => (
                  <div key={tier.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                    <div>
                      <Label htmlFor={`tier-min-${index}`}>Min Qty</Label>
                      <NumberInput
                        id={`tier-min-${index}`}
                        value={tier.min_qty}
                        onChange={(value) =>
                          setField(
                            'tiers',
                            form.tiers.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, min_qty: value } : item,
                            ),
                          )
                        }
                        min={1}
                        showStepper
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`tier-max-${index}`}>Max Qty</Label>
                      <NumberInput
                        id={`tier-max-${index}`}
                        value={tier.max_qty}
                        onChange={(value) =>
                          setField(
                            'tiers',
                            form.tiers.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, max_qty: value } : item,
                            ),
                          )
                        }
                        min={1}
                        showStepper
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`tier-price-${index}`}>Harga</Label>
                      <CurrencyInput
                        id={`tier-price-${index}`}
                        value={tier.price}
                        onChange={(value) =>
                          setField(
                            'tiers',
                            form.tiers.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, price: value } : item,
                            ),
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Hapus tier"
                      onClick={() => setField('tiers', form.tiers.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {errors.tiers && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {errors.tiers}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Modifier / Tambahan</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setField('modifiers', [
                  ...form.modifiers,
                  { id: newClientId('mod'), name: '', price: '0' },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Modifier
            </Button>
          </div>
          {form.modifiers.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Belum ada modifier.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {form.modifiers.map((modifier, index) => (
                <div key={modifier.id} className="grid grid-cols-[1fr_160px_auto] items-end gap-2">
                  <div>
                    <Label htmlFor={`modifier-name-${index}`}>Nama</Label>
                    <Input
                      id={`modifier-name-${index}`}
                      value={modifier.name}
                      onChange={(event) =>
                        setField(
                          'modifiers',
                          form.modifiers.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                      className="mt-1"
                      placeholder="Tulis nama tambahan ..."
                    />
                  </div>
                  <div>
                    <Label htmlFor={`modifier-price-${index}`}>Harga</Label>
                    <CurrencyInput
                      id={`modifier-price-${index}`}
                      value={modifier.price}
                      onChange={(value) =>
                        setField(
                          'modifiers',
                          form.modifiers.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, price: value } : item,
                          ),
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Hapus modifier"
                    onClick={() =>
                      setField('modifiers', form.modifiers.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {errors.modifiers && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {errors.modifiers}
            </p>
          )}
        </div>

        {showCommission && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Komisi Staf</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="product-commission-type">Tipe Komisi</Label>
                <Select
                  id="product-commission-type"
                  value={form.commission_type}
                  onChange={(event) => setField('commission_type', event.target.value as CommissionType)}
                  className="mt-1"
                >
                  <option value="none">Tanpa komisi</option>
                  <option value="percent">Persen dari subtotal</option>
                  <option value="fixed">Nominal per unit</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="product-commission-value">Nilai Komisi</Label>
                {form.commission_type === 'fixed' ? (
                  <CurrencyInput
                    id="product-commission-value"
                    value={form.commission_value}
                    onChange={(value) => setField('commission_value', value)}
                    className="mt-1"
                  />
                ) : (
                  <NumberInput
                    id="product-commission-value"
                    value={form.commission_value}
                    onChange={(value) => setField('commission_value', value)}
                    min={0}
                    decimals={2}
                    showStepper
                    className="mt-1"
                  />
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {form.commission_type === 'percent'
                    ? 'Contoh: 2 → 2% dari subtotal item'
                    : 'Contoh: 1000 → Rp1.000 per unit terjual'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
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

      <UnsavedChangesGuard isDirty={isDirty} />
    </div>
  );
}
