import { createFileRoute } from '@tanstack/react-router';
import { VariantFormPage } from '../../../features/products/VariantFormPage';

export const Route = createFileRoute('/_authenticated/products/$id/variants/$variantId/edit')({
  component: VariantEditRoute,
});

function VariantEditRoute() {
  const { id, variantId } = Route.useParams();
  return <VariantFormPage productId={Number(id)} variantId={Number(variantId)} />;
}
