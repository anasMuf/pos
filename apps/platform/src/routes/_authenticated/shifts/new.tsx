import { createFileRoute } from '@tanstack/react-router';
import { ShiftOpenPage } from '../../../features/shifts/ShiftOpenPage';

export const Route = createFileRoute('/_authenticated/shifts/new')({
  component: ShiftOpenPage,
});
