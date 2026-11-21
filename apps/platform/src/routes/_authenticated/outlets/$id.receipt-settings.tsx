import { createFileRoute } from '@tanstack/react-router';
import { ReceiptSettingsPage } from '../../../features/outlets/ReceiptSettingsPage';

export const Route = createFileRoute('/_authenticated/outlets/$id/receipt-settings')({
  component: ReceiptSettingsRoute,
});

function ReceiptSettingsRoute() {
  const { id } = Route.useParams();
  return <ReceiptSettingsPage outletId={Number(id)} />;
}
