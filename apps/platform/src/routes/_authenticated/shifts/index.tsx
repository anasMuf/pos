import { createFileRoute } from '@tanstack/react-router';
import { ShiftsPage } from '../../../features/shifts/ShiftsPage';

export const Route = createFileRoute('/_authenticated/shifts/')({
  component: ShiftsPage,
});
