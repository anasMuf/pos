import { Link } from '@tanstack/react-router';
import { Plus, Store } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCapabilityRegistry } from '../../api/queries';
import type { CapabilityDefinition, Outlet } from '../../api/types';
import { Badge, Card, EmptyState, PageHeader } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { formatDate } from '../../lib/format';
import { FALLBACK_CAPABILITIES } from '../../lib/capabilities';

function capabilityChips(outlet: Outlet, definitions: CapabilityDefinition[]) {
  return definitions.filter((item) => outlet.capabilities[item.key]).map((item) => item.label);
}

export function OutletsPage() {
  const { outlets, activeOutletId, setActiveOutletId, canManage } = useApp();
  const { data: registry } = useCapabilityRegistry();
  const definitions = registry ?? FALLBACK_CAPABILITIES;

  return (
    <div>
      <PageHeader
        title="Outlet"
        description="Kelola tenant, outlet, dan capability aktif."
        action={
          canManage ? (
            <Link
              to="/outlets/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="mr-1 h-4 w-4" />
              Buat Outlet
            </Link>
          ) : undefined
        }
      />

      {outlets.length === 0 ? (
        <EmptyState
          title="Belum ada outlet"
          description="Buat outlet pertama dan pilih preset capability yang sesuai jenis usaha."
          action={
            canManage ? (
              <Link to="/outlets/new" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                Buat Outlet
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {outlets.map((outlet) => {
            const chips = capabilityChips(outlet, definitions);
            return (
              <Card key={outlet.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{outlet.name}</p>
                      <p className="text-xs text-gray-500">{outlet.address}</p>
                      <p className="mt-1 text-xs text-gray-400">Dibuat {formatDate(outlet.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {activeOutletId === outlet.id && <Badge tone="green">aktif</Badge>}
                    <Badge tone={outlet.default_connection_mode === 'online' ? 'blue' : 'yellow'}>
                      {outlet.default_connection_mode}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {chips.length === 0 ? (
                    <Badge tone="gray">tanpa capability</Badge>
                  ) : (
                    chips.map((chip) => (
                      <Badge key={chip} tone="indigo">
                        {chip}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {canManage && (
                    <Link
                      to="/outlets/$id"
                      params={{ id: String(outlet.id) }}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Kelola
                    </Link>
                  )}
                  {activeOutletId !== outlet.id && (
                    <Button type="button" size="sm" onClick={() => setActiveOutletId(outlet.id)}>
                      Jadikan Aktif
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
