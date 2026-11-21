import { createFileRoute } from '@tanstack/react-router';
import { InventoryMutationPage } from '../../../features/inventory/InventoryMutationPage';

export const Route = createFileRoute('/_authenticated/inventory/new')({
  component: InventoryMutationPage,
});
