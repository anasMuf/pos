import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCommissionReport, useReconciliation, useReportSummary } from '../../api/queries';
import {
  AccessDenied,
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  PageHeader,
  Spinner,
  StatCard,
  Table,
} from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/atoms/Select';
import { Label } from '../../components/atoms/Label';
import { FieldError } from '../../components/atoms/FieldError';
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format';
import { defaultReportRange } from '../../lib/reports';
import { downloadCSV, toCSV } from '../../lib/csv';

export function ReportsPage() {
  const { outlets, canManage } = useApp();
  const initial = useMemo(() => defaultReportRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [outletFilter, setOutletFilter] = useState('');
  const outletId = outletFilter ? Number(outletFilter) : undefined;
  const rangeError =
    from && to && from > to ? 'Tanggal "Dari" tidak boleh melewati tanggal "Sampai".' : '';
  const queriesEnabled = canManage && !rangeError;

  const summaryQuery = useReportSummary(from, to, outletId, queriesEnabled);
  const reconQuery = useReconciliation(from, to, outletId, queriesEnabled);
  const commissionQuery = useCommissionReport(from, to, outletId, queriesEnabled);

  const summary = summaryQuery.data;
  const recon = reconQuery.data;
  const commission = commissionQuery.data;
  const isFetching = summaryQuery.isFetching || reconQuery.isFetching || commissionQuery.isFetching;

  const totals = summary?.totals ?? {
    orders_count: 0,
    revenue: 0,
    paid_amount: 0,
    outstanding: 0,
    offline_orders: 0,
    average_order_value: 0,
  };
  const byOutlet = summary?.by_outlet ?? [];
  const byPaymentMethod = summary?.by_payment_method ?? [];
  const daily = summary?.daily ?? [];
  const recentOffline = recon?.recent_offline ?? [];
  const commissionRows = commission?.by_staff ?? [];

  const exportOutlets = () => {
    if (!summary) return;
    downloadCSV(
      `laporan-outlet-${from}-${to}.csv`,
      toCSV(
        ['Outlet', 'Pesanan', 'Pendapatan', 'Terbayar', 'Sisa', 'Offline'],
        byOutlet.map((row) => [
          row.outlet_name,
          row.orders_count,
          row.revenue,
          row.paid_amount,
          row.outstanding,
          row.offline_orders,
        ]),
      ),
    );
  };

  const exportPaymentMethods = () => {
    if (!summary) return;
    downloadCSV(
      `laporan-pembayaran-${from}-${to}.csv`,
      toCSV(
        ['Metode', 'Jumlah', 'Transaksi'],
        byPaymentMethod.map((row) => [row.payment_method, row.amount, row.count]),
      ),
    );
  };

  const exportDaily = () => {
    if (!summary) return;
    downloadCSV(
      `laporan-harian-${from}-${to}.csv`,
      toCSV(
        ['Tanggal', 'Pesanan', 'Pendapatan'],
        daily.map((row) => [row.date, row.orders_count, row.revenue]),
      ),
    );
  };

  const exportCommissions = () => {
    if (!commission) return;
    downloadCSV(
      `komisi-staf-${from}-${to}.csv`,
      toCSV(
        ['Staf', 'Pesanan', 'Komisi'],
        commissionRows.map((row) => [row.user_name, row.orders_count, row.commission_amount]),
      ),
    );
  };

  const exportReconciliation = () => {
    if (!recon) return;
    downloadCSV(
      `rekonsiliasi-offline-${from}-${to}.csv`,
      toCSV(
        ['Nomor', 'Outlet', 'Dibuat klien', 'Disinkron', 'Total', 'Status'],
        recentOffline.map((row) => [
          row.order_number,
          row.outlet_name,
          row.client_created_at,
          row.synced_at ?? '',
          row.total_amount,
          row.payment_status,
        ]),
      ),
    );
  };

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Laporan" description="Rekap penjualan lintas outlet." />
        <AccessDenied message="Laporan hanya tersedia untuk pemilik atau pengelola outlet." />
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div>
        <PageHeader title="Laporan" description="Rekap penjualan lintas outlet." />
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
        title="Laporan"
        description="Rekap penjualan lintas outlet dan rekonsiliasi sinkronisasi offline."
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void summaryQuery.refetch();
              void reconQuery.refetch();
            }}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="ml-1">Muat ulang</span>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="report-from">Dari</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1"
            aria-invalid={!!rangeError}
            aria-describedby={rangeError ? 'report-range-error' : undefined}
          />
        </div>
        <div>
          <Label htmlFor="report-to">Sampai</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1"
            aria-invalid={!!rangeError}
            aria-describedby={rangeError ? 'report-range-error' : undefined}
          />
        </div>
        <div>
          <Label htmlFor="report-outlet">Outlet</Label>
          <Select
            id="report-outlet"
            value={outletFilter}
            onChange={(event) => setOutletFilter(event.target.value)}
            className="mt-1"
          >
            <option value="">Semua outlet</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rangeError && (
        <div className="mb-6">
          <FieldError id="report-range-error" message={rangeError} />
        </div>
      )}

      {summaryQuery.isError && <ErrorAlert message="Gagal memuat ringkasan laporan." />}

      {rangeError ? (
        <EmptyState
          title="Rentang tanggal tidak valid"
          description="Perbaiki tanggal “Dari” dan “Sampai” untuk memuat laporan."
        />
      ) : summaryQuery.isLoading ? (
        <Spinner />
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Pendapatan"
              value={formatCurrency(totals.revenue)}
              hint={`${formatNumber(totals.orders_count)} pesanan`}
            />
            <StatCard
              label="Terbayar"
              value={formatCurrency(totals.paid_amount)}
              hint={`Sisa ${formatCurrency(totals.outstanding)}`}
            />
            <StatCard
              label="Rata-rata / Pesanan"
              value={formatCurrency(totals.average_order_value)}
            />
            <StatCard
              label="Pesanan Offline"
              value={formatNumber(totals.offline_orders)}
              hint="Disinkronkan ke server"
            />
            <StatCard label="Outlet Terlibat" value={String(byOutlet.length)} />
            <StatCard
              label="Komisi Staf"
              value={formatCurrency(commission?.total ?? 0)}
              hint={`${commissionRows.length} staf`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card
              title="Perbandingan Outlet"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={exportOutlets}
                  disabled={!summary || byOutlet.length === 0}
                >
                  Export CSV
                </Button>
              }
            >
              {byOutlet.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada data pada periode ini.</p>
              ) : (
                <Table headers={['Outlet', 'Pesanan', 'Pendapatan', 'Terbayar', 'Sisa', 'Offline']}>
                  {byOutlet.map((row) => (
                    <tr key={row.outlet_id}>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.outlet_name}</td>
                      <td className="px-3 py-2">{formatNumber(row.orders_count)}</td>
                      <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-2">{formatCurrency(row.paid_amount)}</td>
                      <td className="px-3 py-2">{formatCurrency(row.outstanding)}</td>
                      <td className="px-3 py-2">{formatNumber(row.offline_orders)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card
              title="Metode Pembayaran"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={exportPaymentMethods}
                  disabled={!summary || byPaymentMethod.length === 0}
                >
                  Export CSV
                </Button>
              }
            >
              {byPaymentMethod.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada pembayaran pada periode ini.</p>
              ) : (
                <Table headers={['Metode', 'Jumlah', 'Transaksi']}>
                  {byPaymentMethod.map((row) => (
                    <tr key={row.payment_method}>
                      <td className="px-3 py-2">
                        <Badge tone="indigo">{row.payment_method}</Badge>
                      </td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2">{formatNumber(row.count)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>

          <div className="mt-6">
            <Card
              title="Penjualan Harian"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={exportDaily}
                  disabled={!summary || daily.length === 0}
                >
                  Export CSV
                </Button>
              }
            >
              {daily.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada penjualan pada periode ini.</p>
              ) : (
                <Table headers={['Tanggal', 'Pesanan', 'Pendapatan']}>
                  {daily.map((row) => (
                    <tr key={row.date}>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{formatNumber(row.orders_count)}</td>
                      <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        </>
      ) : null}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Komisi Staf</h2>
        {commissionQuery.isError && <ErrorAlert message="Gagal memuat laporan komisi." />}
        <Card
          title="Komisi per Staf"
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={exportCommissions}
              disabled={commissionRows.length === 0}
            >
              Export CSV
            </Button>
          }
        >
          {commissionQuery.isLoading ? (
            <Spinner />
          ) : commissionRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada komisi pada periode ini. Aktifkan capability Komisi Staf pada outlet dan atur
              komisi per produk.
            </p>
          ) : (
            <Table headers={['Staf', 'Pesanan', 'Komisi']}>
              {commissionRows.map((row) => (
                <tr key={row.user_id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{row.user_name}</td>
                  <td className="px-3 py-2">{formatNumber(row.orders_count)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.commission_amount)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Rekonsiliasi Sinkronisasi</h2>
        {reconQuery.isError && <ErrorAlert message="Gagal memuat rekonsiliasi." />}
        {reconQuery.isLoading ? (
          <Spinner />
        ) : recon ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Pesanan Offline" value={formatNumber(recon.offline_orders)} />
              <StatCard label="Pesanan Online" value={formatNumber(recon.online_orders)} />
              <StatCard label="Offline Tersinkron" value={formatNumber(recon.synced_offline_orders)} />
              <StatCard label="Pendapatan Offline" value={formatCurrency(recon.offline_revenue)} />
            </div>

            <div className="mt-4">
              <Card
                title="Pesanan Offline Terbaru"
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={exportReconciliation}
                    disabled={!recon || recentOffline.length === 0}
                  >
                    Export CSV
                  </Button>
                }
              >
                {recentOffline.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada pesanan offline pada periode ini.</p>
                ) : (
                  <Table headers={['Nomor', 'Outlet', 'Dibuat klien', 'Disinkron', 'Total', 'Status']}>
                    {recentOffline.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{row.order_number}</td>
                        <td className="px-3 py-2 text-gray-500">{row.outlet_name}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(row.client_created_at)}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(row.synced_at)}</td>
                        <td className="px-3 py-2">{formatCurrency(row.total_amount)}</td>
                        <td className="px-3 py-2">
                          <Badge
                            tone={
                              row.payment_status === 'paid'
                                ? 'green'
                                : row.payment_status === 'partial'
                                  ? 'yellow'
                                  : 'red'
                            }
                          >
                            {row.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
