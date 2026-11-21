import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useOutlet, useUpdateOutlet } from '../../api/queries';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

export function OutletEditPage({ outletId }: { outletId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isLoading, isError } = useOutlet(outletId);
  const updateOutlet = useUpdateOutlet();
  const [form, setForm] = useState({
    name: '',
    address: '',
    default_connection_mode: 'online' as 'online' | 'offline',
  });

  useEffect(() => {
    if (!outlet) return;
    setForm({
      name: outlet.name,
      address: outlet.address,
      default_connection_mode: outlet.default_connection_mode,
    });
  }, [outlet]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Edit Outlet" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah data outlet." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;
  if (isError || !outlet) {
    return (
      <div>
        <PageHeader title="Edit Outlet" />
        <EmptyState
          title="Outlet tidak ditemukan"
          description="Outlet tidak tersedia atau Anda tidak memiliki akses."
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
    if (!form.name.trim() || !form.address.trim()) {
      addToast({ variant: 'error', title: 'Data belum lengkap', message: 'Nama dan alamat outlet wajib diisi.' });
      return;
    }
    try {
      await updateOutlet.mutateAsync({
        id: outletId,
        name: form.name,
        address: form.address,
        default_connection_mode: form.default_connection_mode,
      });
      addToast({ variant: 'success', title: 'Outlet diperbarui', message: form.name });
      navigate({ to: '/outlets/$id', params: { id: String(outletId) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal memperbarui outlet',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`Edit Outlet${outlet ? ` · ${outlet.name}` : ''}`}
        description="Perbarui informasi dasar outlet."
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
            <Label htmlFor="outlet-name">Nama Outlet</Label>
            <Input
              id="outlet-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="outlet-address">Alamat</Label>
            <Input
              id="outlet-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="outlet-mode">Mode Koneksi Bawaan</Label>
            <Select
              id="outlet-mode"
              value={form.default_connection_mode}
              onChange={(event) =>
                setForm({ ...form, default_connection_mode: event.target.value as 'online' | 'offline' })
              }
              className="mt-1"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={updateOutlet.isPending}>
            {updateOutlet.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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
    </div>
  );
}
