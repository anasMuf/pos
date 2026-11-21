import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListSkeleton } from '../../src/components/molecules/ui';

describe('ListSkeleton', () => {
  it('announces a busy status while lists load', () => {
    render(<ListSkeleton rows={3} />);
    const status = screen.getByRole('status', { name: 'Memuat data' });

    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.children).toHaveLength(3);
  });

  it('caps the number of placeholder rows', () => {
    render(<ListSkeleton rows={99} variant="cards" />);
    expect(screen.getByRole('status').children).toHaveLength(5);
  });
});
