import type { Order } from '../../api/types';
import { useReceiptSettings } from '../../api/queries';
import { Button } from '../../components/atoms/Button';
import { Spinner } from '../../components/molecules/ui';
import { ReceiptView } from './ReceiptView';

export function ReceiptModal({
  order,
  outletId,
  outletName,
  onClose,
}: {
  order: Order;
  outletId: number;
  outletName: string;
  onClose: () => void;
}) {
  const { data: settings, isLoading } = useReceiptSettings(outletId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Struk {order.order_number}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {isLoading || !settings ? (
          <Spinner />
        ) : (
          <ReceiptView order={order} settings={settings} outletName={outletName} />
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Tutup
          </Button>
          <Button type="button" className="flex-1" onClick={() => window.print()} disabled={!settings}>
            Cetak
          </Button>
        </div>
      </div>
    </div>
  );
}
