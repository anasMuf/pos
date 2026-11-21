import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/products/$id/variants/$variantId')({
  component: Outlet,
});
