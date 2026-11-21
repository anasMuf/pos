import { createFileRoute } from '@tanstack/react-router';
import { NewOutletPage } from '../../../features/outlets/NewOutletPage';

export const Route = createFileRoute('/_authenticated/outlets/new')({
  component: NewOutletPage,
});
