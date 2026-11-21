import { createFileRoute } from '@tanstack/react-router';
import { TenantFormPage } from '../../../features/tenants/TenantFormPage';

export const Route = createFileRoute('/_authenticated/tenants/new')({
  component: () => <TenantFormPage />,
});
