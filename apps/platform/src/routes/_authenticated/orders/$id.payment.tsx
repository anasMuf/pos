import { createFileRoute } from '@tanstack/react-router';
import { OrderPaymentPage } from '../../../features/orders/OrderPaymentPage';

export const Route = createFileRoute('/_authenticated/orders/$id/payment')({
  component: OrderPaymentRoute,
});

function OrderPaymentRoute() {
  const { id } = Route.useParams();
  return <OrderPaymentPage orderId={Number(id)} />;
}
