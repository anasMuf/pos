import { customInstance } from './mutator/custom-instance';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface Envelope<T> {
  message: string;
  data: T;
  meta?: PaginationMeta;
}

type RawResponse<E> = {
  data: E;
  status: number;
  headers: Headers;
};

type RequestOptions = RequestInit & { params?: Record<string, unknown> };

async function unwrap<T>(request: Promise<RawResponse<Envelope<T>>>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return unwrap<T>(customInstance<RawResponse<Envelope<T>>>(url, { method: 'GET', params }));
}

// apiGetPage keeps the pagination metadata from the envelope so list screens can
// accumulate pages (infinite scroll) instead of hard-coding a page size.
export async function apiGetPage<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<PaginatedResult<T>> {
  const response = await customInstance<RawResponse<Envelope<T[]>>>(
    url,
    { method: 'GET', params } as RequestOptions,
  );
  const items = response.data.data ?? [];
  const meta = response.data.meta ?? {
    page: 1,
    limit: items.length,
    total: items.length,
    has_more: false,
  };
  return { items, meta };
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return unwrap<T>(
    customInstance<RawResponse<Envelope<T>>>(url, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    } as RequestOptions),
  );
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return unwrap<T>(
    customInstance<RawResponse<Envelope<T>>>(url, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    } as RequestOptions),
  );
}

export function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return unwrap<T>(
    customInstance<RawResponse<Envelope<T>>>(url, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    } as RequestOptions),
  );
}

export function apiDelete<T>(url: string): Promise<T> {
  return unwrap<T>(customInstance<RawResponse<Envelope<T>>>(url, { method: 'DELETE' }));
}
