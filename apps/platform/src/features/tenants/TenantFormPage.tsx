import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCreateTenant, useTenant, useUpdateTenant } from '../../api/queries';
import { AccessDenied, Card, EmptyState, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

export function TenantFormPage({ tenantId }: { tenantId?: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: tenant, isLoading, isError } = useTenant(tenantId ?? null);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const [form, setForm] = useState({ name: '', code: '', status: 'active' as 'active' | 'inactive' });
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  useEffect(() => {
    if (!tenant) return;
    setForm({ name: tenant.name, code: tenant.code, status: tenant.status });
  }, [tenant]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title={tenantId ? 'Edit Tenant' : 'Tenant Baru'} />
        <AccessDenied message="Hanya pemilik atau pengelola yang dapat mengelola tenant." />
      </div>
    );
  }

  if (tenantId && isLoading) return <Spinner />;
  if (tenantId && (isError || !tenant)) {
    return (
      <div>
        <PageHeader title="Edit Tenant" />
        <EmptyState
          title="Tenant tidak ditemukan"
          description="Tenant tidak tersedia atau Anda tidak memiliki akses."
          action={
            <Link to="/tenants" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Kembali ke Tenant
            </Link>
          }
        />
      </div>
    );
  }

  const validate = () => {
    const next: { name?: string; code?: string } = {};
    if (form.name.trim().length < 3) next.name = 'Nama tenant minimal 3 karakter.';
    if (!tenantId && form.code.trim().length < 2) next.code = 'Kode tenant minimal 2 karakter.';
    setErrors(next);
    if (next.name) document.getElementById('tenant-name')?.focus();
    else if (next.code) document.getElementById('tenant-code')?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (tenantId) {
        await updateTenant.mutateAsync({ id: tenantId, name: form.name, status: form.status });
        addToast({ variant: 'success', title: 'Tenant diperbarui', message: form.name });
      } else {
        await createTenant.mutateAsync({ name: form.name, code: form.code, status: form.status });
        addToast({ variant: 'success', title: 'Tenant dibuat', message: form.name });
      }
      navigate({ to: '/tenants' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: tenantId ? 'Gagal memperbarui tenant' : 'Gagal membuat tenant',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  const saving = createTenant.isPending || updateTenant.isPending;

  return (
    <div>
      <PageHeader
        title={tenantId ? `Edit Tenant${tenant ? ` · ${tenant.name}` : ''}` : 'Tenant Baru'}
        description="Tenant adalah organisasi yang menaungi satu atau lebih outlet."
        action={
          <Link
            to="/tenants"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="tenant-name">Nama</Label>
            <Input
              id="tenant-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'tenant-name-error' : undefined}
            />
            {errors.name && (
              <p id="tenant-name-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="tenant-code">Kode</Label>
            <Input
              id="tenant-code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className="mt-1"
              disabled={!!tenantId}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? 'tenant-code-error' : undefined}
            />
            {errors.code && (
              <p id="tenant-code-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.code}
              </p>
            )}
            {tenantId && <p className="mt-1 text-xs text-gray-500">Kode tidak dapat diubah.</p>}
          </div>
          <div>
            <Label htmlFor="tenant-status">Status</Label>
            <Select
              id="tenant-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}
              className="mt-1"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : tenantId ? 'Simpan Perubahan' : 'Simpan Tenant'}
          </Button>
          <Link
            to="/tenants"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </Card>
    </div>
  );
}
