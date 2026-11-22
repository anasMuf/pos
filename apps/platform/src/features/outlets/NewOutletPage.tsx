import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useApp } from '../app/AppContext';
import { useCreateOutlet, useCapabilityRegistry, useTenants } from '../../api/queries';
import type { Capabilities } from '../../api/types';
import { FALLBACK_CAPABILITIES, capabilitiesForPreset, emptyCapabilities, findCapabilityPreset, CAPABILITY_PRESETS } from '../../lib/capabilities';
import { Card, PageHeader } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

export function NewOutletPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { outlets } = useApp();
  const { data: tenants = [] } = useTenants();
  const { data: registry } = useCapabilityRegistry();
  const capabilityDefinitions = registry ?? FALLBACK_CAPABILITIES;
  const createOutlet = useCreateOutlet();

  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [connectionMode, setConnectionMode] = useState<'online' | 'offline'>('online');
  const [preset, setPreset] = useState('');
  const [capabilities, setCapabilities] = useState<Capabilities>(() =>
    emptyCapabilities(FALLBACK_CAPABILITIES),
  );

  const applyPreset = (value: string) => {
    setPreset(value);
    setCapabilities(capabilitiesForPreset(capabilityDefinitions, findCapabilityPreset(value)?.capabilities));
  };

  const resetCapabilities = () => {
    setPreset('');
    setCapabilities(capabilitiesForPreset(capabilityDefinitions));
  };

  const handleSubmit = async () => {
    const resolvedTenantId = Number(tenantId) || tenants[0]?.id;
    if (!resolvedTenantId) {
      addToast({ variant: 'error', title: 'Tenant belum dipilih', message: 'Buat atau pilih tenant terlebih dahulu.' });
      return;
    }
    if (!name || !address) {
      addToast({ variant: 'error', title: 'Data belum lengkap', message: 'Nama dan alamat outlet wajib diisi.' });
      return;
    }
    try {
      const outlet = await createOutlet.mutateAsync({
        tenant_id: resolvedTenantId,
        name,
        address,
        capabilities,
        default_connection_mode: connectionMode,
      });
      addToast({ variant: 'success', title: 'Outlet dibuat', message: outlet.name });
      navigate({ to: '/outlets/$id', params: { id: String(outlet.id) } });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal membuat outlet',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader title="Buat Outlet" description="Pilih tenant, isi informasi outlet, dan aktifkan capability." />

      {tenants.length === 0 && (
        <div className="mb-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada tenant. Buat tenant terlebih dahulu di halaman{' '}
          <Link to="/tenants/new" className="font-semibold underline">
            Tenant
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Informasi Outlet">
          <div className="space-y-3">
            {tenants.length > 0 && (
              <div>
                <Label htmlFor="tenant">Tenant</Label>
                <Select
                  id="tenant"
                  value={tenantId || tenants[0]?.id}
                  onChange={(event) => setTenantId(event.target.value)}
                  className="mt-1"
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.code})
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="outlet-name">Nama Outlet</Label>
              <Input
                id="outlet-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1"
                placeholder="Tulis nama outlet ..."
              />
            </div>
            <div>
              <Label htmlFor="outlet-address">Alamat</Label>
              <Input
                id="outlet-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="mt-1"
                placeholder="Tulis alamat outlet ..."
              />
            </div>
            <div>
              <Label htmlFor="connection-mode">Mode Koneksi Bawaan</Label>
              <Select
                id="connection-mode"
                value={connectionMode}
                onChange={(event) => setConnectionMode(event.target.value as 'online' | 'offline')}
                className="mt-1"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="preset">Preset Capability</Label>
              <div className="mt-1 flex gap-2">
                <Select
                  id="preset"
                  value={preset}
                  onChange={(event) => applyPreset(event.target.value)}
                >
                  <option value="">Pilih preset (opsional)</option>
                  {CAPABILITY_PRESETS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" onClick={resetCapabilities}>
                  Reset
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Preset menimpa flag yang ada. Reset mengosongkan semua capability.
              </p>
            </div>
            <Button type="button" onClick={handleSubmit} disabled={createOutlet.isPending} className="w-full">
              {createOutlet.isPending ? 'Menyimpan...' : 'Simpan Outlet'}
            </Button>
          </div>
        </Card>

        <Card title="Capability Flags">
          <div className="space-y-2">
            {capabilityDefinitions.map((item) => (
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
          {outlets.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">Outlet dapat diubah kapan saja di halaman detail.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
