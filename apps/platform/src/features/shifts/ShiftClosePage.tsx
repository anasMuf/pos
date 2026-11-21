import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCashShift, useCloseShift } from '../../api/queries';
import { AccessDenied, Card, PageHeader, Spinner } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { CurrencyInput } from '../../components/atoms/CurrencyInput';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import { FieldError } from '../../components/atoms/FieldError';
import { formatCurrency, formatDateTime } from '../../lib/format';

function differenceLabel(difference: number): string {
  if (Math.abs(difference) < 0.005) return 'Pas';
  return difference > 0 ? 'Lebih' : 'Kurang';
}

export function ShiftClosePage({ shiftId }: { shiftId: number }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { canOperate } = useApp();
  const { data: shift, isLoading, isError } = useCashShift(shiftId);
  const closeMutation = useCloseShift();
  const [closingCash, setClosingCash] = useState('');
  const [error, setError] = useState('');

  const parsedCash = closingCash.trim() === '' ? Number.NaN : Number(closingCash);
  const physicalCash = Number.isFinite(parsedCash) ? parsedCash : null;
  const difference =
    physicalCash === null || !shift ? null : physicalCash - shift.expected_cash;

  if (!canOperate) {
    return (
      <div>
        <PageHeader title="Tutup Shift" />
        <AccessDenied message="Hanya kasir, pengelola, atau pemilik outlet yang dapat menutup shift." />
      </div>
    );
  }

  if (isLoading) return <Spinner />;
  if (isError || !shift) {
    return (
      <div>
        <PageHeader title="Tutup Shift" />
        <p className="text-sm text-gray-500">Shift tidak ditemukan.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    const value = Number(closingCash);
    if (!closingCash || Number.isNaN(value) || value < 0) {
      setError('Kas fisik akhir harus berupa angka 0 atau lebih.');
      document.getElementById('closing-cash')?.focus();
      return;
    }
    setError('');
    try {
      const closed = await closeMutation.mutateAsync({ id: shiftId, closing_cash: value });
      addToast({
        variant: 'success',
        title: 'Shift ditutup',
        message: `Selisih kas ${formatCurrency(closed.cash_difference)}.`,
      });
      navigate({ to: '/shifts' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menutup shift',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Tutup Shift"
        description={`Dibuka ${formatDateTime(shift.opened_at)}`}
        action={
          <Link
            to="/shifts"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <Card>
        {shift.status === 'closed' ? (
          <div className="space-y-2 text-sm text-gray-600">
            <p>Shift ini sudah ditutup pada {formatDateTime(shift.closed_at)}.</p>
            <p>Selisih kas: {formatCurrency(shift.cash_difference)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <dl className="divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-gray-500">Kas awal</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(shift.opening_cash)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-500">
                  Kas sistem (seharusnya)
                  <span className="mt-0.5 block text-xs text-gray-400">
                    Kas awal + penjualan tunai shift ini
                  </span>
                </dt>
                <dd className="font-medium text-gray-900">{formatCurrency(shift.expected_cash)}</dd>
              </div>
            </dl>
            <div>
              <Label htmlFor="closing-cash">Kas fisik akhir shift</Label>
              <CurrencyInput
                id="closing-cash"
                value={closingCash}
                onChange={(value) => {
                  setClosingCash(value);
                  setError('');
                }}
                className="mt-1"
                aria-invalid={!!error}
                aria-describedby={error ? 'closing-cash-error' : undefined}
              />
              <FieldError id="closing-cash-error" message={error} />
            </div>
            <dl className="rounded-md bg-gray-50 px-3 py-2 text-sm" aria-live="polite">
              <div className="flex justify-between py-1">
                <dt className="text-gray-500">Kas fisik dihitung</dt>
                <dd className="font-medium text-gray-900">
                  {physicalCash === null ? '—' : formatCurrency(physicalCash)}
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-gray-500">Selisih (fisik − sistem)</dt>
                <dd className="font-medium text-gray-900">
                  {difference === null ? (
                    '—'
                  ) : (
                    <span>
                      {formatCurrency(difference)}{' '}
                      <span className="text-xs font-semibold text-gray-500">
                        ({differenceLabel(difference)})
                      </span>
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {difference !== null && (
              <p className="text-xs text-gray-600">
                {Math.abs(difference) < 0.005
                  ? 'Kas fisik sudah sesuai dengan catatan sistem.'
                  : difference > 0
                    ? 'Kas fisik lebih besar dari catatan sistem. Periksa kembalian atau transaksi tunai yang belum tercatat.'
                    : 'Kas fisik lebih kecil dari catatan sistem. Periksa uang keluar atau pembayaran tunai yang tercatat ganda.'}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" onClick={handleSubmit} disabled={closeMutation.isPending}>
                {closeMutation.isPending ? 'Menutup...' : 'Tutup Shift'}
              </Button>
              <Link
                to="/shifts"
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Batal
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
