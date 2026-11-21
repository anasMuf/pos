import { useBlocker } from '@tanstack/react-router';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Warns before leaving a form with unsaved changes.
 *
 * - In-app navigation is intercepted by a TanStack Router blocker and resolved
 *   with a `ConfirmDialog` (never `window.confirm`, which breaks E2E runs).
 * - Full page unloads fall back to the browser's native prompt.
 *
 * Forms should clear their dirty state (e.g. reset the baseline) right before
 * navigating after a successful save, otherwise the guard blocks that redirect.
 */
export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  });

  if (blocker.status !== 'blocked') return null;

  return (
    <ConfirmDialog
      open
      title="Perubahan belum disimpan"
      description="Yakin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang."
      confirmLabel="Tinggalkan"
      cancelLabel="Tetap di halaman"
      variant="danger"
      onConfirm={() => blocker.proceed()}
      onCancel={() => blocker.reset()}
    />
  );
}
