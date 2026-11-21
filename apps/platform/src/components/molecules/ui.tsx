import { useEffect, useRef, type ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <span className="text-indigo-500">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

type BadgeTone = 'gray' | 'green' | 'yellow' | 'red' | 'indigo' | 'blue';

const badgeTones: Record<BadgeTone, string> = {
  gray: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}

const SKELETON_KEYS = ['one', 'two', 'three', 'four', 'five'] as const;

/**
 * Placeholder rows for list screens while the first page loads. Keeps the
 * layout from collapsing between loading and loaded states.
 */
export function ListSkeleton({
  rows = 5,
  variant = 'table',
}: {
  rows?: number;
  variant?: 'table' | 'cards';
}) {
  const visible = SKELETON_KEYS.slice(0, Math.max(0, Math.min(rows, SKELETON_KEYS.length)));

  return (
    <output aria-busy="true" aria-label="Memuat data" className="block space-y-2">
      {visible.map((key) => (
        <div
          key={key}
          className={
            variant === 'cards'
              ? 'animate-pulse rounded-lg border border-gray-200 bg-white p-4'
              : 'animate-pulse rounded-md bg-gray-100 px-3 py-3'
          }
        >
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
        </div>
      ))}
    </output>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-600/10">
      {message}
    </div>
  );
}

export function AccessDenied({
  message = 'Anda tidak memiliki akses ke halaman ini. Hubungi pemilik atau pengelola outlet.',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <h3 className="text-sm font-semibold text-gray-900">Akses dibatasi</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Loads the next page when scrolled into view.
 *
 * IntersectionObserver is only an accelerator: the visible button keeps the
 * control keyboard/screen-reader reachable and works when the observer is
 * unavailable.
 */
export function InfiniteScrollSentinel({
  hasNextPage,
  isLoading,
  onLoadMore,
  loadedCount,
  total,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  total?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isLoading, onLoadMore]);

  if (!hasNextPage) {
    return (
      <p className="py-3 text-center text-xs text-gray-500">
        Menampilkan {loadedCount}
        {total !== undefined ? ` dari ${total}` : ''} data
      </p>
    );
  }

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-60"
      >
        {isLoading ? 'Memuat…' : 'Muat lebih banyak'}
      </button>
      <p className="text-xs text-gray-500">
        {loadedCount}
        {total !== undefined ? ` dari ${total}` : ''} data
      </p>
    </div>
  );
}
