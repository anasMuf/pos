import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../../src/components/atoms/Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Simpan</Button>);
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeTruthy();
  });

  it('can be disabled', () => {
    render(<Button disabled>Simpan</Button>);
    const button = screen.getByRole('button', { name: 'Simpan' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
