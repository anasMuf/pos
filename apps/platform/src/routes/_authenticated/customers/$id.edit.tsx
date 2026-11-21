import { createFileRoute } from '@tanstack/react-router';
import { CustomerFormPage } from '../../../features/customers/CustomerFormPage';

export const Route = createFileRoute('/_authenticated/customers/$id/edit')({
  component: CustomerEditRoute,
});

function CustomerEditRoute() {
  const { id } = Route.useParams();
  return <CustomerFormPage customerId={Number(id)} />;
}
