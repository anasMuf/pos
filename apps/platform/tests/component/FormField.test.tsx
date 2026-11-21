import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../../src/components/molecules/FormField';

describe('FormField', () => {
  it('renders a labelled input', () => {
    render(<FormField id="password" name="password" label="Password" type="password" />);
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    render(<FormField id="password" name="password" label="Password" type="password" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;

    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan' }));
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan' }));
    expect(input.type).toBe('password');
  });

  it('exposes inline errors to assistive technology', () => {
    render(<FormField id="email" name="email" label="Email" error="Email wajib diisi." />);
    const input = screen.getByLabelText('Email');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(screen.getByRole('alert').textContent).toBe('Email wajib diisi.');
  });
});
