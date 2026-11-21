import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useCashShifts, useOpenShift } from '../../api/queries';
import { AccessDenied, Card, PageHeader } from '../../components/molecules/ui';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';

export function ShiftOpenPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeOutletId, activeOutlet, canOperate } = useApp();
  const { data: shifts = [] } = useCashShifts(activeOutletId ?? undefined);
  const openShift = shifts.find((shift) => shift.status === 'open');
  const openMutation = useOpenShift();
  const [openingCash, setOpeningCash] = useState('0');

  if (!canOperate) {
    return (
      <div>
        <PageHeader title="Buka Shift" />
        <AccessDenied message="Hanya kasir, pengelola, atau pemilik outlet yang dapat membuka shift." />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!activeOutletId) {
      addToast({ variant: 'error', title: 'Outlet belum dipilih', message: 'Pilih outlet terlebih dahulu.' });
      return;
    }
    try {
      await openMutation.mutateAsync({ outlet_id: activeOutletId, opening_cash: Number(openingCash) || 0 });
      addToast({ variant: 'success', title: 'Shift dibuka', message: 'Kas awal tercatat.' });
      navigate({ to: '/shifts' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal membuka shift',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Buka Shift"
        description={activeOutlet ? `Kas awal untuk ${activeOutlet.name}` : 'Catat kas awal shift.'}
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
        {openShift ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Sudah ada shift terbuka untuk outlet ini.</p>
            <Link
              to="/shifts/$id/close"
              params={{ id: String(openShift.id) }}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Tutup Shift Aktif
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="opening-cash">Kas awal / modal</Label>
              <Input
                id="opening-cash"
                type="number"
                min={0}
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleSubmit} disabled={openMutation.isPending}>
                {openMutation.isPending ? 'Membuka...' : 'Buka Shift'}
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
