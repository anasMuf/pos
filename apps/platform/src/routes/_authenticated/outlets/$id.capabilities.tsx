import { createFileRoute } from '@tanstack/react-router';
import { OutletCapabilitiesPage } from '../../../features/outlets/OutletCapabilitiesPage';

export const Route = createFileRoute('/_authenticated/outlets/$id/capabilities')({
  component: OutletCapabilitiesRoute,
});

function OutletCapabilitiesRoute() {
  const { id } = Route.useParams();
  return <OutletCapabilitiesPage outletId={Number(id)} />;
}
