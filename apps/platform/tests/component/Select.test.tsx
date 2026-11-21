import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../../src/components/atoms/Select';

function ControlledSelect({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('open');
  return (
    <>
      <Select
        id="status"
        value={value}
        aria-label="Status"
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event.target.value);
        }}
      >
        <option value="open">Buka</option>
        <option value="closed">Tutup</option>
      </Select>
      <p data-testid="value">{value}</p>
    </>
  );
}

describe('Select (custom dropdown adapter)', () => {
  it('renders the selected option label without a native select', () => {
    render(<ControlledSelect />);
    const trigger = screen.getByRole('combobox', { name: 'Status' });
    expect(trigger.textContent).toContain('Buka');
    expect(document.querySelector('select')).toBeNull();
  });

  it('parses option children and emits a native-like change event', () => {
    const onChange = vi.fn();
    render(<ControlledSelect onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Tutup' }));

    expect(onChange).toHaveBeenCalledWith('closed');
    expect(screen.getByTestId('value').textContent).toBe('closed');
  });

  it('keeps the empty option selectable as a placeholder', () => {
    render(
      <Select value="" aria-label="Filter" onChange={() => {}}>
        <option value="">Semua outlet</option>
        <option value="1">Outlet A</option>
      </Select>,
    );
    expect(screen.getByRole('combobox', { name: 'Filter' }).textContent).toContain('Semua outlet');
  });
});
