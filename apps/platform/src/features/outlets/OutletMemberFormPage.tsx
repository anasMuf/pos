import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useAssignOutletMember, useOutlet, useSearchUsers } from '../../api/queries';
import type { OutletMember, UserLookup } from '../../api/types';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { OUTLET_ROLE_OPTIONS } from '../../lib/constants';

export function OutletMemberFormPage({ outletId }: { outletId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isLoading, isError } = useOutlet(outletId);
  const assignMember = useAssignOutletMember(outletId);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserLookup | null>(null);
  const [error, setError] = useState('');
  const { data: results = [], isFetching } = useSearchUsers(search);
  const [form, setForm] = useState({ role: 'cashier' as OutletMember['outlet_role'] });

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
    if (!selectedUser) {
      setError('Pilih pengguna terlebih dahulu.');
      return;
    }
    setError('');
    try {
      await assignMember.mutateAsync({ user_id: selectedUser.id, outlet_role: form.role });
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
          <div className="sm:col-span-2">
            <Label htmlFor="member-search">Cari Pengguna</Label>
            <Input
              id="member-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedUser(null);
                setError('');
              }}
              placeholder="Tulis nama, email, atau username ..."
              className="mt-1"
              aria-invalid={!!error}
              aria-describedby={error ? 'member-search-error' : undefined}
            />
            {error && (
              <p id="member-search-error" role="alert" className="mt-1 text-xs text-red-600">
                {error}
              </p>
            )}

            {search.trim().length >= 2 && (
              <div className="mt-2 max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
                {isFetching && results.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">Mencari pengguna...</p>
                ) : results.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">Pengguna tidak ditemukan.</p>
                ) : (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setError('');
                      }}
                      className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900">{user.full_name}</span>
                      <span className="text-xs text-gray-500">
                        {user.email} · @{user.username}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedUser && (
              <p className="mt-2 text-xs text-gray-600">
                Dipilih: <span className="font-semibold text-gray-900">{selectedUser.full_name}</span> (
                {selectedUser.email})
              </p>
            )}
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
              {OUTLET_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
