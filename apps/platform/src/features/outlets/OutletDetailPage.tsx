import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import {
  useCapabilityRegistry,
  useOutlet,
  useOutletMembers,
  useReceiptSettings,
  useRemoveOutletMember,
} from '../../api/queries';
import type { OutletMember } from '../../api/types';
import { Badge, Card, PageHeader, Spinner, Table } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { useToast } from '../../components/molecules/Toast';
import { formatDateTime } from '../../lib/format';
import { FALLBACK_CAPABILITIES } from '../../lib/capabilities';

export function OutletDetailPage({ outletId }: { outletId: number }) {
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isLoading } = useOutlet(outletId);
  const { data: members = [] } = useOutletMembers(outletId);
  const { data: receiptSettings } = useReceiptSettings(outletId);
  const { data: registry } = useCapabilityRegistry();
  const definitions = registry ?? FALLBACK_CAPABILITIES;
  const removeMember = useRemoveOutletMember(outletId);
  const [memberToRemove, setMemberToRemove] = useState<OutletMember | null>(null);

  if (isLoading) return <Spinner />;
  if (!outlet) return <p className="text-sm text-gray-500">Outlet tidak ditemukan.</p>;

  const activeCapabilities = definitions.filter((item) => outlet.capabilities[item.key]);

  const handleRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember.mutateAsync(memberToRemove.id);
      addToast({ variant: 'success', title: 'Anggota dihapus', message: `User #${memberToRemove.user_id}` });
      setMemberToRemove(null);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menghapus anggota',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={outlet.name}
        description={outlet.address}
        action={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Link
                to="/outlets/$id/edit"
                params={{ id: String(outletId) }}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Link>
            )}
            <Link
              to="/outlets"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              ← Kembali
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={outlet.default_connection_mode === 'online' ? 'blue' : 'yellow'}>
          mode {outlet.default_connection_mode}
        </Badge>
        <Badge tone="gray">tenant #{outlet.tenant_id}</Badge>
        <Badge tone="gray">dibuat {formatDateTime(outlet.created_at)}</Badge>
        {!canManage && <Badge tone="red">hanya lihat</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Capability Flags"
          action={
            canManage ? (
              <Link
                to="/outlets/$id/capabilities"
                params={{ id: String(outletId) }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Settings2 className="h-4 w-4" /> Kelola
              </Link>
            ) : undefined
          }
        >
          {activeCapabilities.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada capability aktif.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {activeCapabilities.map((item) => (
                <Badge key={item.key} tone="indigo">
                  {item.label}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Anggota & Role"
          action={
            canManage ? (
              <Link
                to="/outlets/$id/members/new"
                params={{ id: String(outletId) }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-4 w-4" /> Tambah
              </Link>
            ) : undefined
          }
        >
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada anggota pada outlet ini.</p>
          ) : (
            <Table headers={canManage ? ['User ID', 'Role', 'Status', ''] : ['User ID', 'Role', 'Status']}>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">#{member.user_id}</td>
                  <td className="px-3 py-2">
                    <Badge tone="indigo">{member.outlet_role}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={member.is_active ? 'green' : 'gray'}>
                      {member.is_active ? 'aktif' : 'nonaktif'}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Hapus anggota"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Pengaturan Struk"
          action={
            canManage ? (
              <Link
                to="/outlets/$id/receipt-settings"
                params={{ id: String(outletId) }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Settings2 className="h-4 w-4" /> Kelola
              </Link>
            ) : undefined
          }
        >
          {receiptSettings ? (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Header</dt>
                <dd className="font-medium text-gray-900">{receiptSettings.header || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Footer</dt>
                <dd className="font-medium text-gray-900">{receiptSettings.footer || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Ukuran kertas</dt>
                <dd className="font-medium text-gray-900">{receiptSettings.paper_size}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Label / nomor pajak</dt>
                <dd className="font-medium text-gray-900">
                  {receiptSettings.tax_label || '—'} {receiptSettings.tax_number || ''}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Pengaturan struk belum tersedia.</p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!memberToRemove}
        title="Hapus anggota"
        description={memberToRemove ? `Hapus akses user #${memberToRemove.user_id} dari outlet ini?` : undefined}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
