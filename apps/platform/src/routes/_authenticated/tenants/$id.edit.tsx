import { createFileRoute } from '@tanstack/react-router';
import { TenantFormPage } from '../../../features/tenants/TenantFormPage';

export const Route = createFileRoute('/_authenticated/tenants/$id/edit')({
  component: TenantEditRoute,
});

function TenantEditRoute() {
  const { id } = Route.useParams();
  return <TenantFormPage tenantId={Number(id)} />;
}
