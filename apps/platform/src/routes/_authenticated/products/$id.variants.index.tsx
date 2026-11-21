import { createFileRoute } from '@tanstack/react-router';
import { VariantListPage } from '../../../features/products/VariantListPage';

export const Route = createFileRoute('/_authenticated/products/$id/variants/')({
  component: VariantListRoute,
});

function VariantListRoute() {
  const { id } = Route.useParams();
  return <VariantListPage productId={Number(id)} />;
}
