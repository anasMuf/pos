import { type ChangeEvent, forwardRef, useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface NumberInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Number of decimal places used when stepping/rounding (0 = integers). */
  decimals?: number;
  /** Amount added/removed per stepper click. */
  step?: number;
  min?: number;
  max?: number;
  /** Render the spinner buttons. Off by default for free-form quantities. */
  showStepper?: boolean;
  /** Optional unit shown inside the field when there is no stepper (e.g. "%"). */
  suffix?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Numeric text input with an optional spinner (chevron) control.
 *
 * Values stay as strings so partially typed input like "1." is never lost.
 * Use `showStepper` only where nudging by a fixed step is genuinely useful
 * (e.g. cart quantity); free-form amounts like stock or percentages read better
 * as a plain right-aligned numeric field.
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
    step = 1,
    min,
    max,
    showStepper = false,
    suffix,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const current = value.trim() === '' ? null : Number(value);
  const canStep = !disabled && current !== null && !Number.isNaN(current);
  const canDecrement = canStep && (min === undefined || (current as number) - step >= min);
  const canIncrement = canStep && (max === undefined || (current as number) + step <= max);

  const applyStep = (direction: 1 | -1) => {
    const base = current !== null && !Number.isNaN(current) ? current : (min ?? 0);
    const next = base + direction * step;
    const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, next));
    onChange(String(round(clamped, decimals)));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const padding = showStepper ? 'pr-9' : suffix ? 'pr-8' : 'pr-3';

  return (
    <div className={`relative ${className}`}>
      <input
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
        className={`
          block w-full rounded-md bg-white py-2 pl-3 text-base text-gray-900 tabular-nums
          outline-1 -outline-offset-1 outline-gray-300
          placeholder:text-gray-400
          focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
          sm:text-sm/6
          ${padding} text-right
        `}
      />
      {!showStepper && suffix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500"
        >
          {suffix}
        </span>
      )}
      {showStepper && (
        <div className="absolute inset-y-1 right-1 flex w-6 flex-col overflow-hidden rounded border border-gray-200">
          <button
            type="button"
            onClick={() => applyStep(1)}
            disabled={!canIncrement}
            aria-label="Naikkan nilai"
            className="flex flex-1 items-center justify-center bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => applyStep(-1)}
            disabled={!canDecrement}
            aria-label="Turunkan nilai"
            className="flex flex-1 items-center justify-center border-t border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
});
