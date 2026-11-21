import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';
import {
  cacheOutlets,
  cacheProducts,
  cacheReceiptSettings,
  cacheReport,
  getCachedOutlets,
  getCachedProducts,
  getCachedReceiptSettings,
  getCachedReport,
} from '../lib/offlineDb';
import { cacheOutletAccess, readCachedOutletAccess } from '../lib/roles';
import { cacheRegistry, readCachedRegistry } from '../lib/capabilities';
import type {
  CashShift,
  CapabilityDefinition,
  CommissionReport,
  Customer,
  Order,
  OrderPayment,
  OrderStatus,
  Outlet,
  OutletAccess,
  OutletMember,
  PaymentMethod,
  PaymentType,
  Product,
  ProductVariant,
  ReceiptSetting,
  ReconciliationReport,
  ReportSummary,
  StockMovement,
  SyncResult,
  Tenant,
} from './types';

export const queryKeys = {
  tenants: ['tenants'] as const,
  outlets: ['outlets'] as const,
  outlet: (id: number) => ['outlet', id] as const,
  product: (id: number) => ['product', id] as const,
  customer: (id: number) => ['customer', id] as const,
  order: (id: number) => ['order', id] as const,
  cashShift: (id: number) => ['cash-shift', id] as const,
  outletAccess: (id: number) => ['outlet-access', id] as const,
  capabilityRegistry: ['capability-registry'] as const,
  outletMembers: (outletId: number) => ['outlet-members', outletId] as const,
  products: (outletId?: number) => ['products', outletId ?? 'all'] as const,
  variants: (productId: number) => ['product-variants', productId] as const,
  stockMovements: (outletId?: number) => ['stock-movements', outletId ?? 'all'] as const,
  cashShifts: (outletId?: number) => ['cash-shifts', outletId ?? 'all'] as const,
  customers: (outletId?: number) => ['customers', outletId ?? 'all'] as const,
  receiptSettings: (outletId: number) => ['receipt-settings', outletId] as const,
  orders: (filters: Record<string, unknown>) => ['orders', filters] as const,
};

// ---- Tenants ----
export function useTenants() {
  return useQuery({ queryKey: queryKeys.tenants, queryFn: () => apiGet<Tenant[]>('/tenants') });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Tenant>) => apiPost<Tenant>('/tenants', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tenants }),
  });
}

// ---- Outlets ----
export function useOutlets(enabled = true) {
  return useQuery({
    queryKey: queryKeys.outlets,
    queryFn: async () => {
      try {
        const outlets = await apiGet<Outlet[]>('/outlets');
        await cacheOutlets(outlets);
        return outlets;
      } catch (error) {
        const cached = await getCachedOutlets();
        if (cached) return cached;
        throw error;
      }
    },
    enabled,
    retry: 1,
  });
}

export function useOutlet(id: number | null) {
  return useQuery({
    queryKey: queryKeys.outlet(id ?? 0),
    queryFn: () => apiGet<Outlet>(`/outlets/${id}`),
    enabled: !!id,
  });
}

export function useOutletAccess(outletId: number | null) {
  return useQuery({
    queryKey: queryKeys.outletAccess(outletId ?? 0),
    queryFn: async () => {
      try {
        const access = await apiGet<OutletAccess>(`/outlets/${outletId}/access`);
        cacheOutletAccess(access);
        return access;
      } catch (error) {
        const cached = outletId ? readCachedOutletAccess(outletId) : null;
        if (cached) return cached;
        throw error;
      }
    },
    enabled: !!outletId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Capabilities ----
export function useCapabilityRegistry() {
  return useQuery({
    queryKey: queryKeys.capabilityRegistry,
    queryFn: async () => {
      try {
        const definitions = await apiGet<CapabilityDefinition[]>('/capabilities');
        cacheRegistry(definitions);
        return definitions;
      } catch (error) {
        const cached = readCachedRegistry();
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useUpdateOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Outlet>) =>
      apiPatch<Outlet>(`/outlets/${id}`, payload),
    onSuccess: (outlet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outlets });
      queryClient.invalidateQueries({ queryKey: queryKeys.outlet(outlet.id) });
    },
  });
}

export function useCreateOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      tenant_id: number;
      name: string;
      address: string;
      capabilities?: Partial<Outlet['capabilities']>;
      default_connection_mode?: 'online' | 'offline';
    }) => apiPost<Outlet>('/outlets', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.outlets }),
  });
}

export function useUpdateCapabilities(outletId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capabilities: Outlet['capabilities']) =>
      apiPatch<Outlet>(`/outlets/${outletId}/capabilities`, { capabilities }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outlets });
      queryClient.invalidateQueries({ queryKey: queryKeys.outlet(outletId) });
    },
  });
}

export function useOutletMembers(outletId: number | null) {
  return useQuery({
    queryKey: queryKeys.outletMembers(outletId ?? 0),
    queryFn: () => apiGet<OutletMember[]>(`/outlets/${outletId}/members`),
    enabled: !!outletId,
  });
}

export function useAssignOutletMember(outletId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: number; outlet_role: OutletMember['outlet_role'] }) =>
      apiPost<OutletMember>(`/outlets/${outletId}/members`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.outletMembers(outletId) }),
  });
}

export function useRemoveOutletMember(outletId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => apiDelete<null>(`/outlets/${outletId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.outletMembers(outletId) }),
  });
}

// ---- Products ----
export function useProducts(outletId?: number) {
  return useQuery({
    queryKey: queryKeys.products(outletId),
    queryFn: async () => {
      try {
        const products = await apiGet<Product[]>(
          '/products',
          outletId ? { outlet_id: outletId } : undefined,
        );
        if (outletId) {
          await cacheProducts(outletId, products);
        }
        return products;
      } catch (error) {
        if (outletId) {
          const cached = await getCachedProducts(outletId);
          if (cached) return cached;
        }
        throw error;
      }
    },
    retry: 1,
  });
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: queryKeys.product(id ?? 0),
    queryFn: () => apiGet<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      outlet_id: number;
      name: string;
      sku: string;
      category: string;
      pricing_type: Product['pricing_type'];
      base_price: number;
      track_inventory: boolean;
      stock_qty: number;
      min_stock_qty: number;
      pricing_rules?: Record<string, unknown>;
      modifiers_config?: Record<string, unknown>[];
      commission_type?: Product['commission_type'];
      commission_value?: number;
    }) => apiPost<Product>('/products', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Product>) =>
      apiPatch<Product>(`/products/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete<null>(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useVariants(productId: number | null) {
  return useQuery({
    queryKey: queryKeys.variants(productId ?? 0),
    queryFn: () => apiGet<ProductVariant[]>(`/products/${productId}/variants`),
    enabled: !!productId,
  });
}

export function useCreateVariant(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      sku: string;
      barcode?: string;
      price_override?: number;
      stock_qty: number;
    }) => apiPost<ProductVariant>(`/products/${productId}/variants`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) }),
  });
}

export function useUpdateVariant(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<ProductVariant>) =>
      apiPatch<ProductVariant>(`/products/${productId}/variants/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteVariant(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variantId: number) =>
      apiDelete<null>(`/products/${productId}/variants/${variantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ---- Stock movements ----
export function useStockMovements(outletId?: number) {
  return useQuery({
    queryKey: queryKeys.stockMovements(outletId),
    queryFn: () => apiGet<StockMovement[]>('/stock-movements', outletId ? { outlet_id: outletId } : undefined),
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      outlet_id: number;
      product_id: number;
      variant_id?: number;
      movement_type: StockMovement['movement_type'];
      qty_change: number;
      reference_type?: string;
      reference_id?: string;
      note?: string;
    }) => apiPost<StockMovement>('/stock-movements', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ---- Cash shifts ----
export function useCashShifts(outletId?: number) {
  return useQuery({
    queryKey: queryKeys.cashShifts(outletId),
    queryFn: () => apiGet<CashShift[]>('/cash-shifts', outletId ? { outlet_id: outletId } : undefined),
  });
}

export function useCashShift(id: number | null) {
  return useQuery({
    queryKey: queryKeys.cashShift(id ?? 0),
    queryFn: () => apiGet<CashShift>(`/cash-shifts/${id}`),
    enabled: !!id,
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { outlet_id: number; opening_cash: number }) =>
      apiPost<CashShift>('/cash-shifts/open', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-shifts'] }),
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closing_cash }: { id: number; closing_cash: number }) =>
      apiPost<CashShift>(`/cash-shifts/${id}/close`, { closing_cash }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-shifts'] }),
  });
}

// ---- Orders ----
export interface OrderFilters {
  outlet_id?: number;
  customer_id?: number;
  order_status?: OrderStatus;
  payment_status?: string;
  search?: string;
}

export function useOrders(filters: OrderFilters, enabled = true) {
  const params: Record<string, unknown> = {};
  if (filters.outlet_id) params.outlet_id = filters.outlet_id;
  if (filters.customer_id) params.customer_id = filters.customer_id;
  if (filters.order_status) params.order_status = filters.order_status;
  if (filters.payment_status) params.payment_status = filters.payment_status;
  if (filters.search) params.search = filters.search;

  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => apiGet<Order[]>('/orders', params),
    enabled,
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: queryKeys.order(id ?? 0),
    queryFn: () => apiGet<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}

export interface OrderItemPayload {
  product_id: number;
  variant_id?: number;
  qty: number;
  unit_price: number;
  meta_data?: Record<string, unknown>;
}

export interface PaymentPayload {
  client_payment_id: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  note?: string;
}

export interface CreateOrderPayload {
  outlet_id: number;
  shift_id?: number;
  customer_id?: number;
  client_sync_id: string;
  customer_name?: string;
  order_status?: OrderStatus;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  meta_data?: Record<string, unknown>;
  items: OrderItemPayload[];
  initial_payment?: PaymentPayload;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => apiPost<Order>('/orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order_status }: { id: number; order_status: OrderStatus }) =>
      apiPatch<Order>(`/orders/${id}/status`, { order_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & PaymentPayload & { shift_id?: number }) =>
      apiPost<Order>(`/orders/${id}/payments`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export interface SyncOrderPayload {
  shift_id?: number;
  customer_id?: number;
  client_sync_id: string;
  customer_name?: string;
  order_status?: OrderStatus;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  client_created_at: string;
  meta_data?: Record<string, unknown>;
  items: OrderItemPayload[];
  payments: (PaymentPayload & { shift_id?: number; paid_at?: string })[];
}

export function useSyncOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { outlet_id: number; orders: SyncOrderPayload[] }) =>
      apiPost<SyncResult>('/sync/orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

// ---- Customers ----
export function useCustomers(outletId?: number, search?: string) {
  const params: Record<string, unknown> = {};
  if (outletId) params.outlet_id = outletId;
  if (search) params.search = search;

  return useQuery({
    queryKey: [...queryKeys.customers(outletId), search ?? ''],
    queryFn: () => apiGet<Customer[]>('/customers', params),
  });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: queryKeys.customer(id ?? 0),
    queryFn: () => apiGet<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      outlet_id: number;
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      note?: string;
    }) => apiPost<Customer>('/customers', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Customer>) =>
      apiPatch<Customer>(`/customers/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete<null>(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ---- Receipt settings ----
export function useReceiptSettings(outletId: number | null) {
  return useQuery({
    queryKey: queryKeys.receiptSettings(outletId ?? 0),
    queryFn: async () => {
      try {
        const settings = await apiGet<ReceiptSetting>(`/outlets/${outletId}/receipt-settings`);
        if (outletId) {
          await cacheReceiptSettings(outletId, settings);
        }
        return settings;
      } catch (error) {
        const cached = outletId ? await getCachedReceiptSettings(outletId) : null;
        if (cached) return cached;
        throw error;
      }
    },
    enabled: !!outletId,
    retry: 1,
  });
}

export function useUpdateReceiptSettings(outletId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ReceiptSetting>) =>
      apiPut<ReceiptSetting>(`/outlets/${outletId}/receipt-settings`, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.receiptSettings(outletId) }),
  });
}

// ---- Reports ----
export function useReportSummary(from?: string, to?: string, outletId?: number, enabled = true) {
  const params: Record<string, unknown> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (outletId) params.outlet_id = outletId;
  const cacheKey = `summary:${from ?? ''}:${to ?? ''}:${outletId ?? 'all'}`;

  return useQuery({
    queryKey: ['report-summary', params],
    queryFn: async () => {
      try {
        const report = await apiGet<ReportSummary>('/reports/summary', params);
        await cacheReport(cacheKey, report);
        return report;
      } catch (error) {
        const cached = await getCachedReport<ReportSummary>(cacheKey);
        if (cached) return cached;
        throw error;
      }
    },
    enabled,
    retry: 1,
  });
}

export function useCommissionReport(from?: string, to?: string, outletId?: number, enabled = true) {
  const params: Record<string, unknown> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (outletId) params.outlet_id = outletId;
  const cacheKey = `commissions:${from ?? ''}:${to ?? ''}:${outletId ?? 'all'}`;

  return useQuery({
    queryKey: ['report-commissions', params],
    queryFn: async () => {
      try {
        const report = await apiGet<CommissionReport>('/reports/commissions', params);
        await cacheReport(cacheKey, report);
        return report;
      } catch (error) {
        const cached = await getCachedReport<CommissionReport>(cacheKey);
        if (cached) return cached;
        throw error;
      }
    },
    enabled,
    retry: 1,
  });
}

export function useReconciliation(from?: string, to?: string, outletId?: number, enabled = true) {
  const params: Record<string, unknown> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (outletId) params.outlet_id = outletId;
  const cacheKey = `reconciliation:${from ?? ''}:${to ?? ''}:${outletId ?? 'all'}`;

  return useQuery({
    queryKey: ['report-reconciliation', params],
    queryFn: async () => {
      try {
        const report = await apiGet<ReconciliationReport>('/reports/reconciliation', params);
        await cacheReport(cacheKey, report);
        return report;
      } catch (error) {
        const cached = await getCachedReport<ReconciliationReport>(cacheKey);
        if (cached) return cached;
        throw error;
      }
    },
    enabled,
    retry: 1,
  });
}

export type { Order, OrderPayment, Outlet, OutletAccess, OutletMember, Product, ProductVariant, StockMovement, CashShift, Customer, ReceiptSetting, ReportSummary, ReconciliationReport, CommissionReport, CapabilityDefinition };
