import { expect, type APIRequestContext } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@pos.local';
export const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';

export interface Outlet {
  id: number;
  name: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  pricing_type: 'fixed' | 'dimension' | 'tiered';
}

export async function apiAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${API_URL}/health`, { timeout: 5_000 });
    return response.ok();
  } catch {
    return false;
  }
}

export async function apiLogin(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<string> {
  const response = await request.post(`${API_URL}/users/login`, { data: { email, password } });
  expect(response.ok(), `login ${email} failed with ${response.status()}`).toBeTruthy();
  const body = await response.json();
  // Login is the only endpoint that returns the token at the top level.
  const token: string | undefined = body?.data?.token ?? body?.token;
  expect(token, 'login response is missing token').toBeTruthy();
  return token as string;
}

export async function listOutlets(request: APIRequestContext, token: string): Promise<Outlet[]> {
  const response = await request.get(`${API_URL}/outlets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return (body.data ?? []) as Outlet[];
}

export async function listProducts(
  request: APIRequestContext,
  token: string,
  outletId: number,
): Promise<Product[]> {
  const response = await request.get(`${API_URL}/products?outlet_id=${outletId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return (body.data ?? []) as Product[];
}

/**
 * Registers a throwaway user (unique email per run) and assigns it to the given
 * outlet with the requested role.
 */
export async function createOutletMember(
  request: APIRequestContext,
  adminToken: string,
  outletId: number,
  role: 'owner' | 'manager' | 'cashier' | 'operator' = 'cashier',
): Promise<{ email: string; password: string }> {
  const stamp = Date.now();
  const email = `e2e-${role}-${stamp}@example.com`;
  const password = 'member123';

  const register = await request.post(`${API_URL}/users/register`, {
    data: {
      full_name: `E2E ${role} ${stamp}`,
      username: `e2e${role}${stamp}`,
      email,
      password,
      phone: `08${String(stamp).slice(-9)}`,
      address: 'E2E',
    },
  });
  expect(register.status(), `register ${role}`).toBe(201);

  const memberToken = await apiLogin(request, email, password);
  const profile = await request.get(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  expect(profile.ok()).toBeTruthy();
  const profileBody = await profile.json();
  const userId: number | undefined = profileBody?.data?.id;
  expect(userId, `${role} profile id`).toBeTruthy();

  const assign = await request.post(`${API_URL}/outlets/${outletId}/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { user_id: userId, outlet_role: role },
  });
  expect(assign.status(), `assign ${role} to outlet`).toBe(201);

  return { email, password };
}

export function createCashier(
  request: APIRequestContext,
  adminToken: string,
  outletId: number,
): Promise<{ email: string; password: string }> {
  return createOutletMember(request, adminToken, outletId, 'cashier');
}
