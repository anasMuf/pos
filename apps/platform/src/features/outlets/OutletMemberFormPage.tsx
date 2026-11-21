import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useAssignOutletMember, useOutlet } from '../../api/queries';
import type { OutletMember } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

const ROLES: OutletMember['outlet_role'][] = ['owner', 'manager', 'cashier', 'operator'];

export function OutletMemberFormPage({ outletId }: { outletId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isLoading, isError } = useOutlet(outletId);
  const assignMember = useAssignOutletMember(outletId);
  const [form, setForm] = useState({ userId: '', role: 'cashier' as OutletMember['outlet_role'] });

  if (isLoading) return <Spinner />;
  if (isError || !outlet) {
    return (
      <div>
        <PageHeader title="Tambah Anggota" />
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

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Tambah Anggota" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengatur anggota." />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.userId) {
      addToast({ variant: 'error', title: 'User ID kosong', message: 'Masukkan ID pengguna.' });
      return;
    }
    try {
      await assignMember.mutateAsync({ user_id: Number(form.userId), outlet_role: form.role });
      addToast({ variant: 'success', title: 'Anggota ditambahkan', message: 'Akses outlet diperbarui.' });
      navigate({ to: '/outlets/$id', params: { id: String(outletId) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menambah anggota',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Tambah Anggota Outlet"
        description={outlet ? `Berikan akses ke ${outlet.name}.` : 'Berikan akses outlet.'}
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
            <Label htmlFor="member-user">User ID</Label>
            <Input
              id="member-user"
              type="number"
              min={1}
              value={form.userId}
              onChange={(event) => setForm({ ...form, userId: event.target.value })}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Gunakan ID pengguna yang sudah terdaftar (lihat profil pengguna).
            </p>
          </div>
          <div>
            <Label htmlFor="member-role">Role</Label>
            <Select
              id="member-role"
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as OutletMember['outlet_role'] })
              }
              className="mt-1"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={assignMember.isPending}>
            {assignMember.isPending ? 'Menyimpan...' : 'Tambah Anggota'}
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
