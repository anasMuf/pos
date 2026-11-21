import { createFileRoute } from '@tanstack/react-router';
import { PosPage } from '../../features/pos/PosPage';

export const Route = createFileRoute('/_authenticated/pos')({
  component: PosPage,
});
