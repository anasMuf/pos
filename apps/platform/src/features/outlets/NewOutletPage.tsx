import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '../app/AppContext';
import { useCreateOutlet, useCreateTenant, useCapabilityRegistry, useTenants } from '../../api/queries';
import type { Capabilities } from '../../api/types';
import { FALLBACK_CAPABILITIES, capabilitiesForPreset, emptyCapabilities } from '../../lib/capabilities';
import { Card, PageHeader } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

const PRESETS: Record<string, { label: string; capabilities: Partial<Capabilities> }> = {
  retail: {
    label: 'Retail / Distro',
    capabilities: { enable_variants: true, enable_tiered_pricing: true },
  },
  fnb: {
    label: 'F&B',
    capabilities: { enable_variants: true, enable_modifiers: true },
  },
  print: {
    label: 'Percetakan / Sablon',
    capabilities: {
      enable_variants: true,
      enable_modifiers: true,
      enable_dimension_pricing: true,
      enable_tiered_pricing: true,
      enable_order_workflow: true,
      enable_partial_payment: true,
    },
  },
  clothing: {
    label: 'Clothing / Konveksi',
    capabilities: {
      enable_variants: true,
      enable_modifiers: true,
      enable_tiered_pricing: true,
      enable_order_workflow: true,
      enable_partial_payment: true,
    },
  },
};

export function NewOutletPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { outlets } = useApp();
  const { data: tenants = [] } = useTenants();
  const { data: registry } = useCapabilityRegistry();
  const capabilityDefinitions = registry ?? FALLBACK_CAPABILITIES;
  const createTenant = useCreateTenant();
  const createOutlet = useCreateOutlet();

  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [connectionMode, setConnectionMode] = useState<'online' | 'offline'>('online');
  const [preset, setPreset] = useState('');
  const [capabilities, setCapabilities] = useState<Capabilities>(() =>
    emptyCapabilities(FALLBACK_CAPABILITIES),
  );
  const [tenantForm, setTenantForm] = useState({ name: '', code: '' });

  const applyPreset = (value: string) => {
    setPreset(value);
    setCapabilities(
      capabilitiesForPreset(capabilityDefinitions, PRESETS[value]?.capabilities),
    );
  };

  const resetCapabilities = () => {
    setPreset('');
    setCapabilities(capabilitiesForPreset(capabilityDefinitions));
  };

  const handleCreateTenant = async () => {
    if (!tenantForm.name || !tenantForm.code) {
      addToast({ variant: 'error', title: 'Data tenant belum lengkap', message: 'Nama dan kode tenant wajib diisi.' });
      return;
    }
    try {
      const tenant = await createTenant.mutateAsync({
        name: tenantForm.name,
        code: tenantForm.code,
        status: 'active',
      });
      setTenantId(String(tenant.id));
      setTenantForm({ name: '', code: '' });
      addToast({ variant: 'success', title: 'Tenant dibuat', message: tenant.name });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal membuat tenant',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
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
        <Card title="Tenant Baru" className="mb-6">
          <p className="mb-3 text-sm text-gray-500">Belum ada tenant. Buat tenant terlebih dahulu.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="tenant-name">Nama Tenant</Label>
              <Input
                id="tenant-name"
                value={tenantForm.name}
                onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tenant-code">Kode</Label>
              <Input
                id="tenant-code"
                value={tenantForm.code}
                onChange={(event) => setTenantForm({ ...tenantForm, code: event.target.value })}
                className="mt-1"
                placeholder="KNG-01"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleCreateTenant} disabled={createTenant.isPending} className="w-full">
                {createTenant.isPending ? 'Menyimpan...' : 'Buat Tenant'}
              </Button>
            </div>
          </div>
        </Card>
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
                placeholder="Outlet Sudirman"
              />
            </div>
            <div>
              <Label htmlFor="outlet-address">Alamat</Label>
              <Input
                id="outlet-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="mt-1"
                placeholder="Jl. Sudirman No. 45"
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
                  {Object.entries(PRESETS).map(([value, item]) => (
                    <option key={value} value={value}>
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
