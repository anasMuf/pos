import { createFileRoute } from '@tanstack/react-router';
import { OutletsPage } from '../../../features/outlets/OutletsPage';

export const Route = createFileRoute('/_authenticated/outlets/')({
  component: OutletsPage,
});
