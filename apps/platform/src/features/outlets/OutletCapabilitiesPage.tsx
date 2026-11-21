import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCapabilityRegistry, useOutlet, useUpdateCapabilities } from '../../api/queries';
import type { Capabilities } from '../../api/types';
import { AccessDenied, Card, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { useToast } from '../../components/molecules/Toast';
import { FALLBACK_CAPABILITIES, emptyCapabilities } from '../../lib/capabilities';

export function OutletCapabilitiesPage({ outletId }: { outletId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canManage } = useApp();
  const { data: outlet, isLoading } = useOutlet(outletId);
  const { data: registry } = useCapabilityRegistry();
  const definitions = registry ?? FALLBACK_CAPABILITIES;
  const updateCapabilities = useUpdateCapabilities(outletId);
  const [capabilities, setCapabilities] = useState<Capabilities>(() =>
    emptyCapabilities(FALLBACK_CAPABILITIES),
  );

  useEffect(() => {
    if (outlet) setCapabilities(outlet.capabilities);
  }, [outlet]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Capability Outlet" />
        <AccessDenied message="Hanya pemilik atau pengelola outlet yang dapat mengubah capability." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const handleSubmit = async () => {
    try {
      await updateCapabilities.mutateAsync(capabilities);
      addToast({ variant: 'success', title: 'Capability disimpan', message: 'Pengaturan outlet diperbarui.' });
      navigate({ to: '/outlets/$id', params: { id: String(outletId) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menyimpan capability',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`Capability${outlet ? ` · ${outlet.name}` : ''}`}
        description="Aktifkan kemampuan yang sesuai dengan jenis usaha outlet."
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
        <div className="space-y-2">
          {definitions.map((item) => (
            <label key={item.key} className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!!capabilities[item.key]}
                onChange={(event) =>
                  setCapabilities((prev) => ({ ...prev, [item.key]: event.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                <span className="block text-xs text-gray-500">{item.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={handleSubmit} disabled={updateCapabilities.isPending}>
            {updateCapabilities.isPending ? 'Menyimpan...' : 'Simpan Capability'}
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
