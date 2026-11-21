import { createFileRoute } from '@tanstack/react-router';
import { OutletDetailPage } from '../../../features/outlets/OutletDetailPage';

export const Route = createFileRoute('/_authenticated/outlets/$id/')({
  component: OutletDetailRoute,
});

function OutletDetailRoute() {
  const { id } = Route.useParams();
  return <OutletDetailPage outletId={Number(id)} />;
}
