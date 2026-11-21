import { createFileRoute } from '@tanstack/react-router';
import { CustomerFormPage } from '../../../features/customers/CustomerFormPage';

export const Route = createFileRoute('/_authenticated/customers/new')({
  component: () => <CustomerFormPage />,
});
