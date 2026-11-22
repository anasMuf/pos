import { createFileRoute } from '@tanstack/react-router';
import { CustomerDetailPage } from '../../../features/customers/CustomerDetailPage';

export const Route = createFileRoute('/_authenticated/customers/$id/')({
  component: CustomerDetailRoute,
});

function CustomerDetailRoute() {
  const { id } = Route.useParams();
  return <CustomerDetailPage customerId={Number(id)} />;
}
