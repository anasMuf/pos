import { createFileRoute } from '@tanstack/react-router';
import { OutletMemberFormPage } from '../../../features/outlets/OutletMemberFormPage';

export const Route = createFileRoute('/_authenticated/outlets/$id/members/new')({
  component: OutletMemberNewRoute,
});

function OutletMemberNewRoute() {
  const { id } = Route.useParams();
  return <OutletMemberFormPage outletId={Number(id)} />;
}
