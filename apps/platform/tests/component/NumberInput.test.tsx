import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NumberInput } from '../../src/components/atoms/NumberInput';

function ControlledNumberInput(props: {
  initialValue: string;
  min?: number;
  max?: number;
  decimals?: number;
}) {
  const [value, setValue] = useState(props.initialValue);
  return (
    <NumberInput
      aria-label="Qty"
      value={value}
      onChange={setValue}
      min={props.min}
      max={props.max}
      decimals={props.decimals}
    />
  );
}

describe('NumberInput', () => {
  it('increments and decrements with the stepper buttons', () => {
    render(<ControlledNumberInput initialValue="3" />);
    const input = screen.getByLabelText('Qty') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Naikkan' }));
    expect(input.value).toBe('4');

    fireEvent.click(screen.getByRole('button', { name: 'Turunkan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turunkan' }));
    expect(input.value).toBe('2');
  });

  it('respects min and max bounds', () => {
    render(<ControlledNumberInput initialValue="5" min={0} max={5} />);
    const input = screen.getByLabelText('Qty') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Naikkan' }));
    expect(input.value).toBe('5');
    expect((screen.getByRole('button', { name: 'Naikkan' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: '0' } });
    expect((screen.getByRole('button', { name: 'Turunkan' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('steps decimal values without floating point noise', () => {
    render(<ControlledNumberInput initialValue="1.4" decimals={1} />);
    const input = screen.getByLabelText('Qty') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Naikkan' }));
    expect(input.value).toBe('1.5');
  });
});
