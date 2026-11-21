import { Link } from '@tanstack/react-router';
import { Clock, Plus } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCashShifts } from '../../api/queries';
import { AccessDenied, Badge, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/molecules/ui';
import { formatCurrency, formatDateTime } from '../../lib/format';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ShiftsPage() {
  const { activeOutletId, activeOutlet, outlets, canOperate } = useApp();
  const { data: shifts = [], isLoading } = useCashShifts(activeOutletId ?? undefined);

  const openShift = shifts.find((shift) => shift.status === 'open');
  const closedShifts = shifts.filter((shift) => shift.status === 'closed');

  if (!canOperate) {
    return (
      <div>
        <PageHeader title="Shift Kasir" description="Buka dan tutup shift kasir." />
        <AccessDenied message="Hanya kasir, pengelola, atau pemilik outlet yang dapat mengelola shift." />
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Shift Kasir" description="Buka dan tutup shift kasir." />
        <EmptyState
          title="Belum ada outlet"
          description="Buat outlet terlebih dahulu."
          action={
            <Link to="/outlets/new" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Buat Outlet
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Shift Kasir"
        description={activeOutlet ? `Rekap kas untuk ${activeOutlet.name}` : 'Kelola shift kasir.'}
        action={
          <Link
            to="/shifts/new"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="mr-1 h-4 w-4" /> {openShift ? 'Shift Baru' : 'Buka Shift'}
          </Link>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title={openShift ? 'Shift Aktif' : 'Belum Ada Shift Aktif'}
            action={openShift ? <Badge tone="green">open</Badge> : undefined}
          >
            {openShift ? (
              <div className="space-y-3">
                <dl className="divide-y divide-gray-100 text-sm">
                  <Row label="Dibuka" value={formatDateTime(openShift.opened_at)} />
                  <Row label="Kas awal" value={formatCurrency(openShift.opening_cash)} />
                  <Row label="Kas sistem saat ini" value={formatCurrency(openShift.expected_cash)} />
                </dl>
                <Link
                  to="/shifts/$id/close"
                  params={{ id: String(openShift.id) }}
                  className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  <Clock className="mr-1 h-4 w-4" /> Tutup Shift
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Catat modal awal sebelum mulai bertransaksi. Shift terikat pada outlet dan kasir yang login.
                </p>
                <Link
                  to="/shifts/new"
                  className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Buka Shift
                </Link>
              </div>
            )}
          </Card>

          <Card title="Riwayat Shift">
            {closedShifts.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada shift yang ditutup.</p>
            ) : (
              <Table headers={['Ditutup', 'Kas awal', 'Kas akhir', 'Selisih']}>
                {closedShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td className="px-3 py-2 text-gray-600">{formatDateTime(shift.closed_at)}</td>
                    <td className="px-3 py-2">{formatCurrency(shift.opening_cash)}</td>
                    <td className="px-3 py-2">{formatCurrency(shift.closing_cash)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={shift.cash_difference === 0 ? 'green' : shift.cash_difference > 0 ? 'blue' : 'red'}>
                        {formatCurrency(shift.cash_difference)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
