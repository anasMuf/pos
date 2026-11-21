import { createFileRoute } from '@tanstack/react-router';
import { VariantFormPage } from '../../../features/products/VariantFormPage';

export const Route = createFileRoute('/_authenticated/products/$id/variants/new')({
  component: VariantNewRoute,
});

function VariantNewRoute() {
  const { id } = Route.useParams();
  return <VariantFormPage productId={Number(id)} />;
}
