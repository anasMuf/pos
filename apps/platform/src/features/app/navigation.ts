import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type AppPath =
  | '/'
  | '/pos'
  | '/orders'
  | '/customers'
  | '/shifts'
  | '/inventory'
  | '/products'
  | '/outlets'
  | '/tenants'
  | '/reports'
  | '/settings';

export type NavRequirement = 'manage' | 'operate' | 'view';

export interface NavItem {
  to: AppPath;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Minimum access needed to show the entry. Defaults to 'view'. */
  requires?: NavRequirement;
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, requires: 'view' },
  { to: '/pos', label: 'Kasir', icon: ShoppingCart, requires: 'operate' },
  { to: '/orders', label: 'Pesanan', icon: ClipboardList, requires: 'view' },
  { to: '/customers', label: 'Pelanggan', icon: Users, requires: 'view' },
  { to: '/shifts', label: 'Shift', icon: Clock, requires: 'operate' },
  { to: '/inventory', label: 'Inventori', icon: Boxes, requires: 'view' },
  { to: '/products', label: 'Produk', icon: Package, requires: 'view' },
  { to: '/outlets', label: 'Outlet', icon: Store, requires: 'manage' },
  { to: '/tenants', label: 'Tenant', icon: Building2, requires: 'manage' },
  { to: '/reports', label: 'Laporan', icon: BarChart3, requires: 'manage' },
  { to: '/settings', label: 'Pengaturan', icon: Settings, requires: 'view' },
];

export function filterNavItems(
  items: NavItem[],
  access: { canManage: boolean; canOperate: boolean },
): NavItem[] {
  return items.filter((item) => {
    if (item.requires === 'manage') return access.canManage;
    if (item.requires === 'operate') return access.canOperate;
    return true;
  });
}
