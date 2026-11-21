import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useDeleteTenant, useTenants } from '../../api/queries';
import type { Tenant } from '../../api/types';
import { AccessDenied, Badge, Card, EmptyState, PageHeader, Table } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useToast } from '../../components/molecules/Toast';
import { formatDate } from '../../lib/format';

export function TenantsPage() {
  const { canManage } = useApp();
  const { addToast } = useToast();
  const { data: tenants = [] } = useTenants();
  const deleteTenant = useDeleteTenant();
  const [toDelete, setToDelete] = useState<Tenant | null>(null);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Tenant" description="Kelola tenant dan organisasi." />
        <AccessDenied message="Hanya pemilik atau pengelola yang dapat mengelola tenant." />
      </div>
    );
  }

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTenant.mutateAsync(toDelete.id);
      addToast({ variant: 'success', title: 'Tenant dihapus', message: toDelete.name });
      setToDelete(null);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menghapus tenant',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Tenant"
        description="Kelola tenant (organisasi) yang menaungi outlet."
        action={
          <Link
            to="/tenants/new"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="mr-1 h-4 w-4" /> Tambah Tenant
          </Link>
        }
      />

      {tenants.length === 0 ? (
        <EmptyState
          title="Belum ada tenant"
          description="Buat tenant pertama sebelum menambahkan outlet."
          action={
            <Link to="/tenants/new" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Tambah Tenant
            </Link>
          }
        />
      ) : (
        <Card>
          <Table headers={['Nama', 'Kode', 'Status', 'Dibuat', 'Aksi']}>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{tenant.name}</td>
                <td className="px-3 py-2 text-gray-500">{tenant.code}</td>
                <td className="px-3 py-2">
                  <Badge tone={tenant.status === 'active' ? 'green' : 'gray'}>{tenant.status}</Badge>
                </td>
                <td className="px-3 py-2 text-gray-500">{formatDate(tenant.created_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link
                      to="/tenants/$id/edit"
                      params={{ id: String(tenant.id) }}
                      aria-label="Edit tenant"
                      className="inline-flex items-center rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Hapus tenant"
                      onClick={() => setToDelete(tenant)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus tenant"
        description={toDelete ? `Hapus tenant ${toDelete.name}? Outlet terkait harus sudah tidak ada.` : undefined}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
