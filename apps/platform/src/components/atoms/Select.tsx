import type { SelectHTMLAttributes } from 'react';

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`
        block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900
        outline-1 -outline-offset-1 outline-gray-300
        focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
}
