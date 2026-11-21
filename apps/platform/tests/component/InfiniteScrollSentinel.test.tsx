import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InfiniteScrollSentinel } from '../../src/components/molecules/ui';

describe('InfiniteScrollSentinel', () => {
  it('offers a keyboard-accessible load-more button', () => {
    const onLoadMore = vi.fn();
    render(<InfiniteScrollSentinel hasNextPage isLoading={false} onLoadMore={onLoadMore} loadedCount={20} total={42} />);

    fireEvent.click(screen.getByRole('button', { name: 'Muat lebih banyak' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText('20 dari 42 data')).toBeTruthy();
  });

  it('disables the button while the next page is loading', () => {
    render(<InfiniteScrollSentinel hasNextPage isLoading onLoadMore={() => {}} loadedCount={20} />);

    const button = screen.getByRole('button', { name: 'Memuat…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows the loaded count instead of a button when there is no next page', () => {
    render(<InfiniteScrollSentinel hasNextPage={false} isLoading={false} onLoadMore={() => {}} loadedCount={42} total={42} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Menampilkan 42 dari 42 data')).toBeTruthy();
  });
});
