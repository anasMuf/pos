import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { Label } from '../atoms/Label';
import { Input } from '../atoms/Input';
import { FieldError } from '../atoms/FieldError';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Inline validation message; also wires `aria-invalid` and `aria-describedby`. */
  error?: string;
  /** Helper text rendered below the input when there is no error. */
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, id, type, error, hint, ...props }, ref) => {
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="relative mt-2">
          <Input
            id={id}
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...props}
            className={isPassword ? 'pr-20' : ''}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          )}
        </div>
        {error ? (
          <FieldError id={`${id}-error`} message={error} />
        ) : (
          hint && (
            <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
              {hint}
            </p>
          )
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
