import { createFileRoute } from '@tanstack/react-router';
import { ShiftClosePage } from '../../../features/shifts/ShiftClosePage';

export const Route = createFileRoute('/_authenticated/shifts/$id/close')({
  component: ShiftCloseRoute,
});

function ShiftCloseRoute() {
  const { id } = Route.useParams();
  return <ShiftClosePage shiftId={Number(id)} />;
}
