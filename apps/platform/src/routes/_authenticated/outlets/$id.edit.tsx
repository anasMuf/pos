import { createFileRoute } from '@tanstack/react-router';
import { OutletEditPage } from '../../../features/outlets/OutletEditPage';

export const Route = createFileRoute('/_authenticated/outlets/$id/edit')({
  component: OutletEditRoute,
});

function OutletEditRoute() {
  const { id } = Route.useParams();
  return <OutletEditPage outletId={Number(id)} />;
}
