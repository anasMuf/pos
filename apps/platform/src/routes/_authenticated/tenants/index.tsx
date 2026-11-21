import { createFileRoute } from '@tanstack/react-router';
import { TenantsPage } from '../../../features/tenants/TenantsPage';

export const Route = createFileRoute('/_authenticated/tenants/')({
  component: TenantsPage,
});
