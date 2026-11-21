import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from '../../src/components/atoms/Combobox';

const FRUITS: ComboboxOption[] = [
  { value: 'apple', label: 'Apel' },
  { value: 'banana', label: 'Pisang' },
  { value: 'cherry', label: 'Ceri' },
];

function ControlledCombobox(props: {
  options?: ComboboxOption[];
  searchable?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <Combobox
      aria-label="Buah"
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
      options={props.options ?? FRUITS}
      searchable={props.searchable}
      placeholder="Pilih buah"
    />
  );
}

describe('Combobox', () => {
  it('opens a listbox and selects an option', () => {
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Buah' }));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: 'Pisang' }));
    expect(onChange).toHaveBeenCalledWith('banana');
    expect(screen.getByRole('combobox', { name: 'Buah' }).textContent).toContain('Pisang');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('supports keyboard selection', () => {
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Buah' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('banana');
  });

  it('filters options when searchable', () => {
    render(<ControlledCombobox searchable />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Buah' }));

    fireEvent.change(screen.getByLabelText('Cari…'), { target: { value: 'cer' } });
    expect(screen.getByRole('option', { name: 'Ceri' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Apel' })).toBeNull();
  });

  it('shows an empty state when nothing matches', () => {
    render(<ControlledCombobox searchable />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Buah' }));

    fireEvent.change(screen.getByLabelText('Cari…'), { target: { value: 'zzz' } });
    expect(screen.getByText('Tidak ada hasil')).toBeTruthy();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<ControlledCombobox />);
    const trigger = screen.getByRole('combobox', { name: 'Buah' });

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
