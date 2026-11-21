import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateCustomer, useCustomer, useUpdateCustomer } from '../../api/queries';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', note: '' };

export function CustomerFormPage({ customerId }: { customerId?: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeOutletId, activeOutlet, canOperate } = useApp();
  const { data: customer, isLoading, isError } = useCustomer(customerId ?? null);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!customer) return;
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      note: customer.note,
    });
  }, [customer]);

  if (!canOperate) {
    return (
      <div>
        <PageHeader title={customerId ? 'Edit Pelanggan' : 'Pelanggan Baru'} />
        <AccessDenied message="Hanya kasir atau pengelola outlet yang dapat mengubah pelanggan." />
      </div>
    );
  }

  if (customerId && isLoading) return <Spinner />;
  if (customerId && (isError || !customer)) {
    return (
      <div>
        <PageHeader title="Edit Pelanggan" />
        <EmptyState
          title="Pelanggan tidak ditemukan"
          description="Pelanggan tidak tersedia atau sudah dihapus."
          action={
            <Link to="/customers" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Kembali ke Pelanggan
            </Link>
          }
        />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      addToast({ variant: 'error', title: 'Nama wajib diisi', message: 'Masukkan nama pelanggan.' });
      return;
    }
    if (!customerId && !activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }
    try {
      if (customerId) {
        await updateCustomer.mutateAsync({ id: customerId, ...form });
        addToast({ variant: 'success', title: 'Pelanggan diperbarui', message: form.name });
      } else {
        await createCustomer.mutateAsync({ outlet_id: activeOutletId as number, ...form });
        addToast({ variant: 'success', title: 'Pelanggan ditambahkan', message: form.name });
      }
      navigate({ to: '/customers' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menyimpan pelanggan',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  const saving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div>
      <PageHeader
        title={customerId ? `Edit Pelanggan${customer ? ` · ${customer.name}` : ''}` : 'Pelanggan Baru'}
        description={activeOutlet ? `Pelanggan ${activeOutlet.name}` : 'Data pelanggan.'}
        action={
          <Link
            to="/customers"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer-name">Nama</Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="customer-phone">Telepon</Label>
            <Input
              id="customer-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="customer-address">Alamat</Label>
            <Input
              id="customer-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="customer-note">Catatan</Label>
            <Input
              id="customer-note"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              className="mt-1"
              placeholder="Preferensi, catatan produksi, dll."
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : customerId ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
          </Button>
          <Link
            to="/customers"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </Card>
    </div>
  );
}
