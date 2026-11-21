import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Minus, Plus, Search, ShoppingCart, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../app/AppContext';
import {
  useCashShifts,
  useCreateOrder,
  useCustomers,
  useProducts,
  useVariants,
  type OrderItemPayload,
} from '../../api/queries';
import type { OrderStatus, PaymentMethod, PaymentType, Product } from '../../api/types';
import { Badge, Card, EmptyState, PageHeader, AccessDenied } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { FieldError } from '../../components/atoms/FieldError';
import { useToast } from '../../components/molecules/Toast';
import { formatCurrency, newClientId } from '../../lib/format';
import { priceLine } from '../../lib/pricing';

interface CartItem {
  key: string;
  product: Product;
  variantId?: number;
  variantName?: string;
  qty: number;
  unitPrice: number;
  modifiers: string[];
  meta: Record<string, unknown>;
}

export function PosPage() {
  const { activeOutlet, activeOutletId, outlets, mode, effectiveMode, enqueueOfflineOrder, canOperate } = useApp();
  const { addToast } = useToast();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts(activeOutletId ?? undefined);
  const { data: shifts = [] } = useCashShifts(activeOutletId ?? undefined);
  const { data: customers = [] } = useCustomers(activeOutletId ?? undefined);
  const createOrder = useCreateOrder();

  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('completed');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxPercent, setTaxPercent] = useState('0');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const capabilities = activeOutlet?.capabilities;
  const openShift = shifts.find((shift) => shift.status === 'open');
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, search]);

  const total = (() => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const discount = Math.min(
      subtotal,
      (subtotal * (Number(discountPercent) || 0)) / 100 + (Number(discountAmount) || 0),
    );
    const taxable = subtotal - discount;
    return taxable + (taxable * (Number(taxPercent) || 0)) / 100;
  })();

  const amountDue =
    paymentType === 'full' ? total : Math.min(Number(paymentAmount) || 0, total);
  const parsedCash = cashReceived.trim() === '' ? Number.NaN : Number(cashReceived);
  const changeDue = Number.isFinite(parsedCash) ? parsedCash - amountDue : null;

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    setSelectedProduct(null);
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, qty: Math.max(1, item.qty + delta) } : item)),
    );
  };

  const removeItem = (key: string) => setCart((prev) => prev.filter((item) => item.key !== key));

  const resetCheckout = () => {
    setCart([]);
    setCustomerName('');
    setCustomerId('');
    setPaymentType('full');
    setPaymentAmount('');
    setCashReceived('');
    setPaymentError('');
    setOrderStatus('completed');
    setDiscountPercent('0');
    setDiscountAmount('0');
    setTaxPercent('0');
  };

  const resolvePaymentAmount = () => {
    if (paymentType === 'full') return total;
    const parsed = Number(paymentAmount);
    if (!parsed || parsed <= 0) return 0;
    return Math.min(parsed, total);
  };

  const handleCheckout = async () => {
    if (!activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }
    if (cart.length === 0) {
      addToast({ variant: 'warning', title: 'Keranjang kosong', message: 'Tambahkan produk sebelum membayar.' });
      return;
    }

    const paidAmount = resolvePaymentAmount();
    if (paymentType === 'down_payment' && paidAmount <= 0) {
      addToast({ variant: 'error', title: 'Nominal DP tidak valid', message: 'Masukkan nominal DP yang benar.' });
      return;
    }

    if (paymentMethod === 'cash') {
      const received = Number(cashReceived);
      if (cashReceived.trim() === '' || !Number.isFinite(received) || received < paidAmount) {
        setPaymentError(`Uang diterima minimal ${formatCurrency(paidAmount)}.`);
        addToast({
          variant: 'error',
          title: 'Uang diterima kurang',
          message: 'Nominal uang diterima harus sama atau lebih besar dari total pembayaran.',
        });
        document.getElementById('cash-received')?.focus();
        return;
      }
      setPaymentError('');
    }

    const items: OrderItemPayload[] = cart.map((item) => ({
      product_id: item.product.id,
      variant_id: item.variantId,
      qty: item.qty,
      unit_price: item.unitPrice,
      meta_data: item.meta,
    }));
    const clientSyncId = newClientId('sync-ord');
    const resolvedCustomerId = customerId ? Number(customerId) : undefined;
    const payment = {
      client_payment_id: newClientId('sync-pay'),
      payment_type: paymentType,
      payment_method: paymentMethod,
      amount: paidAmount,
      note: paymentType === 'down_payment' ? 'DP saat transaksi' : 'Pembayaran penuh',
    };
    const resolvedStatus = capabilities?.enable_order_workflow ? orderStatus : 'completed';
    const pricing = {
      discount_percent: Number(discountPercent) || 0,
      discount_amount: Number(discountAmount) || 0,
      tax_percent: Number(taxPercent) || 0,
    };

    if (effectiveMode === 'offline') {
      enqueueOfflineOrder({
        outlet_id: activeOutletId,
        shift_id: openShift?.id,
        client_sync_id: clientSyncId,
        customer_id: resolvedCustomerId,
        customer_name: customerName || undefined,
        order_status: resolvedStatus,
        client_created_at: new Date().toISOString(),
        meta_data: {},
        ...pricing,
        items,
        payments: [{ ...payment, shift_id: openShift?.id, paid_at: new Date().toISOString() }],
      });
      addToast({
        variant: 'success',
        title: 'Tersimpan offline',
        message: 'Transaksi masuk antrean sinkronisasi lokal.',
      });
      resetCheckout();
      return;
    }

    setSubmitting(true);
    try {
      await createOrder.mutateAsync({
        outlet_id: activeOutletId,
        shift_id: openShift?.id,
        client_sync_id: clientSyncId,
        customer_id: resolvedCustomerId,
        customer_name: customerName || undefined,
        order_status: resolvedStatus,
        meta_data: {},
        ...pricing,
        items,
        initial_payment: payment,
      });
      addToast({ variant: 'success', title: 'Transaksi berhasil', message: 'Pesanan telah dicatat.' });
      resetCheckout();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan transaksi.';
      addToast({
        variant: 'error',
        title: 'Transaksi gagal',
        message: `${message} Anda dapat beralih ke mode offline untuk menyimpan lokal.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutRef = useRef(handleCheckout);
  useEffect(() => {
    checkoutRef.current = handleCheckout;
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (event.key === 'F2' || (event.key === '/' && !typing)) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === 'F9') {
        event.preventDefault();
        void checkoutRef.current();
        return;
      }
      if (event.key === 'Escape') {
        if (selectedProduct) {
          setSelectedProduct(null);
          return;
        }
        if (document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedProduct]);

  if (!canOperate) {
    return (
      <div>
        <PageHeader title="Kasir" description="Transaksi penjualan outlet." />
        <AccessDenied message="Hanya kasir, pengelola, atau pemilik outlet yang dapat membuka kasir." />
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Kasir" description="Transaksi penjualan outlet." />
        <EmptyState
          title="Belum ada outlet"
          description="Buat outlet terlebih dahulu sebelum memulai transaksi."
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
        title="Kasir"
        description={activeOutlet ? `Outlet: ${activeOutlet.name}` : 'Pilih outlet untuk mulai transaksi.'}
        action={
        		  <Badge tone={effectiveMode === 'online' ? 'green' : 'red'}>
        			{effectiveMode === 'online' ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
        			{effectiveMode === 'online' ? 'Online' : 'Offline'}
        		  </Badge>
        }
      />

      {effectiveMode === 'offline' && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {mode === 'offline'
            ? 'Mode offline aktif. Transaksi disimpan lokal dan disinkronkan saat kembali online.'
            : 'Koneksi ke server terputus. Transaksi akan disimpan lokal hingga koneksi pulih.'}
        </div>
      )}

      {!openShift && (
        <div className="mb-4 flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Belum ada shift terbuka. Transaksi tetap bisa dicatat tanpa shift, tetapi rekap kas tidak akurat.</span>
          <Link to="/shifts" className="font-semibold underline">
            Buka Shift
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        {/* Catalog */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari produk, SKU, atau kategori..."
              className="pl-9"
            />
            <p className="mt-1 text-xs text-gray-400">
              Shortcut: <kbd className="rounded border border-gray-300 px-1">F2</kbd> cari ·{' '}
              <kbd className="rounded border border-gray-300 px-1">F9</kbd> bayar ·{' '}
              <kbd className="rounded border border-gray-300 px-1">Esc</kbd> tutup
            </p>
          </div>

          {isLoadingProducts ? (
            <Card>
              <p className="text-sm text-gray-500">Memuat katalog...</p>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="Katalog kosong"
              description="Belum ada produk pada outlet ini."
              action={
                <Link to="/products" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                  Tambah Produk
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="flex flex-col rounded-lg bg-white p-3 text-left shadow-sm ring-1 ring-gray-900/5 transition hover:ring-indigo-400"
                >
                  <span className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</span>
                  <span className="mt-1 text-xs text-gray-500">{product.sku}</span>
                  <span className="mt-auto pt-2 text-sm font-bold text-indigo-600">
                    {formatCurrency(product.base_price)}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone="gray">{product.pricing_type}</Badge>
                    {product.track_inventory && (
                      <Badge tone={product.stock_qty <= product.min_stock_qty ? 'red' : 'green'}>
                        stok {product.stock_qty}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card title="Keranjang" action={<Badge tone="indigo">{cart.length} item</Badge>}>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Keranjang masih kosong.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <li key={item.key} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.product.name}
                          {item.variantName ? ` · ${item.variantName}` : ''}
                        </p>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-gray-500">{item.modifiers.join(', ')}</p>
                        )}
                        <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} / unit</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => updateQty(item.key, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <Button type="button" variant="secondary" size="sm" onClick={() => updateQty(item.key, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.unitPrice * item.qty)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Pembayaran">
            <div className="space-y-3">
              <div>
                <Label htmlFor="customer-select">Pelanggan Terdaftar</Label>
                <Select
                  id="customer-select"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="mt-1"
                >
                  <option value="">Walk-in / tanpa pelanggan</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="customer">Nama Pelanggan (opsional)</Label>
                <Input
                  id="customer"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama cepat untuk walk-in"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                <div>
                  <Label htmlFor="discount-percent">Diskon %</Label>
                  <Input
                    id="discount-percent"
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="discount-amount">Diskon Rp</Label>
                  <Input
                    id="discount-amount"
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tax-percent">Pajak %</Label>
                  <Input
                    id="tax-percent"
                    type="number"
                    min={0}
                    max={100}
                    value={taxPercent}
                    onChange={(event) => setTaxPercent(event.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="payment-type">Tipe</Label>
                  <Select
                    id="payment-type"
                    value={paymentType}
                    onChange={(event) => setPaymentType(event.target.value as PaymentType)}
                    className="mt-1"
                  >
                    <option value="full">Lunas</option>
                    {capabilities?.enable_partial_payment && <option value="down_payment">DP</option>}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-method">Metode</Label>
                  <Select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    className="mt-1"
                  >
                    <option value="cash">Cash</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer</option>
                  </Select>
                </div>
              </div>

              {paymentType === 'down_payment' && (
                <div>
                  <Label htmlFor="payment-amount">Nominal DP</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div>
                  <Label htmlFor="cash-received">Uang diterima</Label>
                  <Input
                    id="cash-received"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={cashReceived}
                    onChange={(event) => {
                      setCashReceived(event.target.value);
                      setPaymentError('');
                    }}
                    placeholder="0"
                    className="mt-1"
                    aria-invalid={!!paymentError}
                    aria-describedby={paymentError ? 'cash-received-error' : undefined}
                  />
                  <FieldError id="cash-received-error" message={paymentError} />
                  <div className="mt-2 flex items-center justify-between text-sm" aria-live="polite">
                    <span className="text-gray-500">Kembalian</span>
                    <span className="font-semibold text-gray-900">
                      {changeDue === null ? '—' : formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {capabilities?.enable_order_workflow && (
                <div>
                  <Label htmlFor="order-status">Status Pengerjaan</Label>
                  <Select
                    id="order-status"
                    value={orderStatus}
                    onChange={(event) => setOrderStatus(event.target.value as OrderStatus)}
                    className="mt-1"
                  >
                    <option value="queued">Antrean</option>
                    <option value="in_progress">Diproses</option>
                    <option value="ready">Siap</option>
                    <option value="completed">Selesai</option>
                  </Select>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
              >
                <ShoppingCart className="mr-1 h-4 w-4" />
                {submitting ? 'Menyimpan...' : effectiveMode === 'offline' ? 'Simpan Offline' : 'Bayar & Simpan'}
              </Button>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={resetCheckout}
                  className="w-full text-xs text-gray-500 hover:text-gray-700"
                >
                  Kosongkan keranjang
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {selectedProduct && (
        <ItemConfigurator
          product={selectedProduct}
          enableVariants={!!capabilities?.enable_variants}
          enableModifiers={!!capabilities?.enable_modifiers}
          enableDimension={!!capabilities?.enable_dimension_pricing}
          enableTiered={!!capabilities?.enable_tiered_pricing}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}

function ItemConfigurator({
  product,
  enableVariants,
  enableModifiers,
  enableDimension,
  enableTiered,
  onClose,
  onAdd,
}: {
  product: Product;
  enableVariants: boolean;
  enableModifiers: boolean;
  enableDimension: boolean;
  enableTiered: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const { data: variants = [] } = useVariants(enableVariants ? product.id : null);
  const [variantId, setVariantId] = useState<number | undefined>(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const variant = variants.find((item) => item.id === variantId);
  const priced = priceLine({
    product,
    variant,
    qty,
    width: Number(width) || 0,
    height: Number(height) || 0,
    selectedModifiers,
    dimensionEnabled: enableDimension,
    tieredEnabled: enableTiered,
  });
  const modifiers = enableModifiers ? priced.modifiers : [];
  const { unitPrice, area, minArea, dimensionActive, dimensionUnit, dimensionInvalid } = priced;

  const meta: Record<string, unknown> = {};
  if (dimensionActive) {
    meta.width = Number(width) || 0;
    meta.height = Number(height) || 0;
    meta.area = area;
    meta.unit = dimensionUnit;
  }
  if (selectedModifiers.length > 0) {
    meta.modifiers = selectedModifiers;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
            <p className="text-xs text-gray-500">
              {product.sku} · {product.pricing_type}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {enableVariants && variants.length > 0 && (
            <div>
              <Label htmlFor="variant">Varian</Label>
              <Select
                id="variant"
                value={variantId ?? ''}
                onChange={(event) => setVariantId(event.target.value ? Number(event.target.value) : undefined)}
                className="mt-1"
              >
                <option value="">Tanpa varian</option>
                {variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.price_override > 0 ? `(+${formatCurrency(item.price_override)})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {dimensionActive && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width">Lebar ({dimensionUnit})</Label>
                <Input
                  id="width"
                  type="number"
                  min={0}
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height">Tinggi ({dimensionUnit})</Label>
                <Input
                  id="height"
                  type="number"
                  min={0}
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="mt-1"
                />
              </div>
              <p className="col-span-2 text-xs text-gray-500">
                Area terhitung: {area || 0} {dimensionUnit}²
                {minArea > 0 ? ` (min ${minArea})` : ''}
              </p>
            </div>
          )}

          {modifiers.length > 0 && (
            <div>
              <Label>Tambahan</Label>
              <div className="mt-1 space-y-1">
                {modifiers.map((modifier) => (
                  <label key={modifier.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedModifiers.includes(modifier.name)}
                        onChange={(event) =>
                          setSelectedModifiers((prev) =>
                            event.target.checked
                              ? [...prev, modifier.name]
                              : prev.filter((name) => name !== modifier.name),
                          )
                        }
                      />
                      {modifier.name}
                    </span>
                    <span className="text-gray-500">+{formatCurrency(modifier.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="qty">Qty</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={qty}
                onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                className="mt-1"
              />
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(unitPrice * qty)}</p>
            </div>
          </div>
        </div>

        		<div className="mt-5 space-y-2">
        			{dimensionInvalid && (
        				<p className="text-xs text-red-600">Isi lebar dan tinggi untuk menghitung harga dimensi.</p>
        			)}
        			<div className="flex gap-2">
        				<Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
        					Batal
        				</Button>
        				<Button
        					type="button"
        					className="flex-1"
        					disabled={dimensionInvalid}
        					onClick={() =>
        						onAdd({
        							key: newClientId('cart'),
        							product,
        							variantId,
        							variantName: variant?.name,
        							qty,
        							unitPrice,
        							modifiers: selectedModifiers,
        							meta,
        						})
        					}
        				>
        					Tambah
        				</Button>
        			</div>
        		</div>
      </div>
    </div>
  );
}
