import { customInstance } from './mutator/custom-instance';

export interface Envelope<T> {
  message: string;
  data: T;
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
