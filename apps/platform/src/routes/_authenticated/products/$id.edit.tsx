import { createFileRoute } from '@tanstack/react-router';
import { ProductFormPage } from '../../../features/products/ProductFormPage';

export const Route = createFileRoute('/_authenticated/products/$id/edit')({
  component: ProductEditRoute,
});

function ProductEditRoute() {
  const { id } = Route.useParams();
  return <ProductFormPage productId={Number(id)} />;
}
