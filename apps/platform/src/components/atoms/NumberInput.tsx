import { type ChangeEvent, forwardRef, useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from './Input';

interface NumberInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Number of decimal places the stepper should step/round by (0 = integers). */
  decimals?: number;
  min?: number;
  max?: number;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Text-based numeric input with explicit increment/decrement controls.
 *
 * Keeps the form value as a string (like the rest of the forms) so typed values
 * such as "1." or an empty field are never mangled while the user is typing.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    id,
    value,
    onChange,
    placeholder,
    className = '',
    disabled,
    decimals = 0,
    min,
    max,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const step = decimals > 0 ? round(1 / 10 ** decimals, decimals) : 1;

  const current = value.trim() === '' ? null : Number(value);
  const canDecrement = !disabled && (current === null || min === undefined || current - step >= min);
  const canIncrement = !disabled && (current === null || max === undefined || current + step <= max);

  const apply = (next: number) => {
    const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, next));
    onChange(String(round(clamped, decimals)));
  };

  const handleStep = (direction: 1 | -1) => {
    const base = current === null || Number.isNaN(current) ? (min ?? 0) : current;
    apply(base + direction * step);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={`flex items-stretch gap-1 ${className}`}>
      <Input
        ref={ref}
        id={inputId}
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className="text-right tabular-nums"
      />
      <div className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-gray-300">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={!canDecrement}
          aria-label="Kurangi"
          className="flex w-8 items-center justify-center bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={!canIncrement}
          aria-label="Tambah"
          className="flex w-8 items-center justify-center border-l border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});
