import { type ChangeEvent, forwardRef, useId } from 'react';
import { Input } from './Input';

interface CurrencyInputProps {
  id?: string;
  /** Raw digits (no separators), e.g. "1500000". Empty string for no value. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowDecimals?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

const formatter = new Intl.NumberFormat('id-ID');

function formatRaw(raw: string, allowDecimals: boolean): string {
  if (raw === '') return '';
  const normalized = allowDecimals ? raw.replace(',', '.') : raw;
  const [integerPart, decimalPart] = normalized.split('.');
  const grouped = formatter.format(Number(integerPart || 0));
  if (!allowDecimals || decimalPart === undefined) return grouped;
  return `${grouped},${decimalPart.slice(0, 2)}`;
}

/**
 * Rupiah input that formats thousands (id-ID) while typing and reports the raw
 * digits to the form, so payloads keep sending plain numbers.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  {
    id,
    value,
    onChange,
    placeholder = '0',
    className = '',
    disabled,
    allowDecimals = false,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const cleaned = event.target.value.replace(/[^\d,.]/g, '');
    if (!allowDecimals) {
      onChange(cleaned.replace(/\D/g, '').replace(/^0+(?=\d)/, ''));
      return;
    }
    const [integerPart = '', ...rest] = cleaned.replace(/\./g, ',').split(',');
    const decimals = rest.join('').slice(0, 2);
    const integer = integerPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    onChange(rest.length > 0 ? `${integer || '0'}.${decimals}` : integer);
  };

  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500"
      >
        Rp
      </span>
      <Input
        ref={ref}
        id={inputId}
        type="text"
        inputMode="numeric"
        value={formatRaw(value, allowDecimals)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className="pl-9 text-right tabular-nums"
      />
    </div>
  );
});
