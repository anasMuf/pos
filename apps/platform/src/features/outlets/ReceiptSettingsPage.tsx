import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useOutlet, useReceiptSettings, useUpdateReceiptSettings } from '../../api/queries';
import type { PaperSize } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { UnsavedChangesGuard, allowNextNavigation } from '../../components/molecules/UnsavedChangesGuard';
import { PAPER_SIZE_OPTIONS } from '../../lib/constants';

const EMPTY_FORM = {
  header: '',
  footer: '',
  paper_size: '58mm' as PaperSize,
  show_customer: true,
  show_cashier: true,
  show_payment_details: true,
  tax_label: '',
  tax_number: '',
};

export function ReceiptSettingsPage({ outletId }: { outletId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isError: isOutletError } = useOutlet(outletId);
  const { data: settings, isLoading, isError: isSettingsError } = useReceiptSettings(outletId);
  const updateReceipt = useUpdateReceiptSettings(outletId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!settings) return;
    const next = {
      header: settings.header,
      footer: settings.footer,
      paper_size: settings.paper_size,
      show_customer: settings.show_customer,
      show_cashier: settings.show_cashier,
      show_payment_details: settings.show_payment_details,
      tax_label: settings.tax_label,
      tax_number: settings.tax_number,
    };
    setForm(next);
    setBaseline(next);
  }, [settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Pengaturan Struk" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah pengaturan struk." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;
  if (isOutletError || !outlet || isSettingsError) {
    return (
      <div>
        <PageHeader title="Pengaturan Struk" />
        <EmptyState
          title="Pengaturan struk tidak tersedia"
          description="Outlet atau pengaturan struk tidak dapat dimuat."
          action={
            <Link to="/outlets" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Kembali ke Outlet
            </Link>
          }
        />
      </div>
    );
  }

  const handleSubmit = async () => {
    try {
      await updateReceipt.mutateAsync(form);
      addToast({ variant: 'success', title: 'Pengaturan struk disimpan', message: 'Perubahan diterapkan.' });
      setBaseline(form);
      allowNextNavigation();
      navigate({ to: '/outlets/$id', params: { id: String(outletId) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menyimpan pengaturan struk',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`Pengaturan Struk${outlet ? ` · ${outlet.name}` : ''}`}
        description="Atur informasi yang tampil pada bukti transaksi."
        action={
          <Link
            to="/outlets/$id"
            params={{ id: String(outletId) }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="receipt-header">Header</Label>
            <Input
              id="receipt-header"
              value={form.header}
              onChange={(event) => setForm({ ...form, header: event.target.value })}
              className="mt-1"
              placeholder="Tulis nama toko ..."
            />
          </div>
          <div>
            <Label htmlFor="receipt-footer">Footer</Label>
            <Input
              id="receipt-footer"
              value={form.footer}
              onChange={(event) => setForm({ ...form, footer: event.target.value })}
              className="mt-1"
              placeholder="Tulis ucapan penutup ..."
            />
          </div>
          <div>
            <Label htmlFor="receipt-paper">Ukuran Kertas</Label>
            <Select
              id="receipt-paper"
              value={form.paper_size}
              onChange={(event) => setForm({ ...form, paper_size: event.target.value as PaperSize })}
              className="mt-1"
            >
              {PAPER_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="receipt-tax-label">Label Pajak</Label>
            <Input
              id="receipt-tax-label"
              value={form.tax_label}
              onChange={(event) => setForm({ ...form, tax_label: event.target.value })}
              className="mt-1"
              placeholder="Tulis NPWP ..."
            />
          </div>
          <div>
            <Label htmlFor="receipt-tax-number">Nomor Pajak</Label>
            <Input
              id="receipt-tax-number"
              value={form.tax_number}
              onChange={(event) => setForm({ ...form, tax_number: event.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.show_customer}
                onChange={(event) => setForm({ ...form, show_customer: event.target.checked })}
              />
              Tampilkan pelanggan
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.show_cashier}
                onChange={(event) => setForm({ ...form, show_cashier: event.target.checked })}
              />
              Tampilkan kasir
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.show_payment_details}
                onChange={(event) => setForm({ ...form, show_payment_details: event.target.checked })}
              />
              Tampilkan rincian pembayaran
            </label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={updateReceipt.isPending}>
            {updateReceipt.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
          <Link
            to="/outlets/$id"
            params={{ id: String(outletId) }}
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
