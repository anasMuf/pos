import { createFileRoute } from '@tanstack/react-router';
import { InventoryMutationPage } from '../../../features/inventory/InventoryMutationPage';

export const Route = createFileRoute('/_authenticated/inventory/new')({
  validateSearch: (search: Record<string, unknown>) => ({
    product_id: Number(search.product_id) || undefined,
    variant_id: Number(search.variant_id) || undefined,
  }),
  component: InventoryNewRoute,
});

function InventoryNewRoute() {
  const search = Route.useSearch();
  return (
    <InventoryMutationPage
      initialProductId={search.product_id}
      initialVariantId={search.variant_id}
    />
  );
}
