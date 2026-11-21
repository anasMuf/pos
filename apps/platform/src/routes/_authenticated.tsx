import { Outlet, Link, createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw, Store, Wifi, WifiOff } from 'lucide-react';
import { hasToken, useAuth } from '../features/auth/AuthContext';
import { useApp } from '../features/app/AppContext';
import { filterNavItems, navItems } from '../features/app/navigation';
import { Button } from '../components/atoms/Button';
import { Select } from '../components/atoms/Select';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { useToast } from '../components/molecules/Toast';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!hasToken()) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const {
    outlets,
    activeOutletId,
    setActiveOutletId,
    mode,
    effectiveMode,
    isConnected,
    checkConnection,
    toggleMode,
    pendingSyncCount,
    failedSyncIds,
    isSyncing,
    syncNow,
    role,
    canManage,
    canOperate,
  } = useApp();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const visibleNavItems = useMemo(
    () => filterNavItems(navItems, { canManage, canOperate }),
    [canManage, canOperate],
  );
  const mobileNavItems = useMemo(() => visibleNavItems.slice(0, 6), [visibleNavItems]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = useCallback(() => {
    setShowLogoutDialog(false);
    logout();
    navigate({ to: '/login' });
  }, [logout, navigate]);

  const handleToggleMode = useCallback(async () => {
    // Connection lost while the user still expects online mode: try to reconnect.
    if (mode === 'online' && !isConnected) {
      const reconnected = await checkConnection();
      if (!reconnected) {
        addToast({ variant: 'warning', title: 'Masih offline', message: 'Server belum dapat dijangkau.' });
        return;
      }
      addToast({ variant: 'success', title: 'Koneksi pulih', message: 'Menyinkronkan antrean...' });
      if (pendingSyncCount > 0) {
        const result = await syncNow();
        if (result.failed) {
          addToast({
            variant: 'error',
            title: 'Sinkronisasi sebagian gagal',
            message: `${result.failedCount} transaksi tetap tersimpan di antrean.`,
          });
        }
      }
      return;
    }

    if (mode === 'online') {
      toggleMode();
      addToast({ variant: 'warning', title: 'Mode Offline', message: 'Transaksi baru akan disimpan lokal.' });
      return;
    }

    toggleMode();
    if (pendingSyncCount > 0) {
      const result = await syncNow();
      if (result.failed) {
        addToast({
          variant: 'error',
          title: 'Sinkronisasi sebagian gagal',
          message: `${result.failedCount} transaksi tetap tersimpan di antrean.`,
        });
      } else {
        addToast({ variant: 'success', title: 'Sinkronisasi selesai', message: `${result.synced} transaksi tersinkronisasi.` });
      }
    } else {
      addToast({ variant: 'success', title: 'Mode Online', message: 'Koneksi ke server aktif.' });
    }
  }, [mode, isConnected, checkConnection, toggleMode, pendingSyncCount, syncNow, addToast]);

  const handleManualSync = useCallback(async () => {
    const result = await syncNow();
    if (result.failed) {
      addToast({
        variant: 'error',
        title: 'Sinkronisasi sebagian gagal',
        message: `${result.failedCount} transaksi tetap tersimpan. Retry dari Pengaturan.`,
      });
    } else if (result.synced === 0) {
      addToast({ variant: 'info', title: 'Tidak ada antrean', message: 'Semua transaksi sudah tersinkronisasi.' });
    } else {
      addToast({ variant: 'success', title: 'Sinkronisasi selesai', message: `${result.synced} transaksi tersinkronisasi.` });
    }
  }, [syncNow, addToast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">POS Universal</p>
            <p className="text-xs text-gray-500">Multi-capability</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="sidebar-outlet">
            Outlet aktif
          </label>
          <Select
            id="sidebar-outlet"
            value={activeOutletId ?? ''}
            onChange={(event) => setActiveOutletId(Number(event.target.value))}
          >
            {outlets.length === 0 && <option value="">Belum ada outlet</option>}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </Select>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white lg:hidden">
                <Store className="h-4 w-4" />
              </div>
              <div className="lg:hidden">
                <Select
                  aria-label="Outlet aktif"
                  value={activeOutletId ?? ''}
                  onChange={(event) => setActiveOutletId(Number(event.target.value))}
                  className="max-w-[170px]"
                >
                  {outlets.length === 0 && <option value="">Belum ada outlet</option>}
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-gray-900">
                  {outlets.find((outlet) => outlet.id === activeOutletId)?.name ?? 'Pilih outlet'}
                </p>
                <p className="text-xs text-gray-500">
                  Mode {effectiveMode === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingSyncCount > 0 && (
                <span
                  className={`hidden items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset sm:inline-flex ${
                    failedSyncIds.length > 0
                      ? 'bg-red-50 text-red-700 ring-red-600/20'
                      : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                  }`}
                >
                  {failedSyncIds.length > 0
                    ? `${failedSyncIds.length} gagal / ${pendingSyncCount} antrean`
                    : `${pendingSyncCount} antrean`}
                </span>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing || pendingSyncCount === 0 || !isConnected}
                title="Sinkronkan antrean offline"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="ml-1 hidden sm:inline">Sync</span>
              </Button>

              <Button
                type="button"
                variant={effectiveMode === 'online' ? 'secondary' : 'danger'}
                size="sm"
                onClick={handleToggleMode}
                title="Ubah mode koneksi"
              >
                {effectiveMode === 'online' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">{effectiveMode === 'online' ? 'Online' : 'Offline'}</span>
              </Button>

              <div className="hidden items-center gap-2 border-l border-gray-200 pl-2 sm:flex">
                <span className="max-w-[120px] truncate text-sm text-gray-600">{user?.full_name}</span>
                {role && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{role}</span>}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white lg:hidden">
        <div className="grid grid-cols-6">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  active ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <ConfirmDialog
        open={showLogoutDialog}
        title="Sign out"
        description="Are you sure you want to sign out? You will need to sign in again to access your dashboard."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}
