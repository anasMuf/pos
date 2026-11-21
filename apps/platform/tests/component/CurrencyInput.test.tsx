import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrencyInput } from '../../src/components/atoms/CurrencyInput';

function ControlledCurrencyInput({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <CurrencyInput aria-label="Nominal" value={value} onChange={setValue} />
      <p data-testid="raw">{value}</p>
    </>
  );
}

describe('CurrencyInput', () => {
  it('formats thousands separators for the display value', () => {
    render(<ControlledCurrencyInput initialValue="1500000" />);
    expect((screen.getByLabelText('Nominal') as HTMLInputElement).value).toBe('1.500.000');
  });

  it('reports raw digits when the user types a formatted amount', () => {
    render(<ControlledCurrencyInput />);
    const input = screen.getByLabelText('Nominal') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '2.500.000' } });
    expect(screen.getByTestId('raw').textContent).toBe('2500000');
    expect(input.value).toBe('2.500.000');
  });

  it('drops non-numeric characters and leading zeros', () => {
    render(<ControlledCurrencyInput />);
    const input = screen.getByLabelText('Nominal') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Rp 00120rb' } });
    expect(screen.getByTestId('raw').textContent).toBe('120');
  });
});
