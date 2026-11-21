import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/outlets/$id/members')({
  component: Outlet,
});
