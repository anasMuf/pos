import {
  Children,
  type ReactNode,
  type SelectHTMLAttributes,
  isValidElement,
} from 'react';
import { Combobox, type ComboboxOption } from './Combobox';

interface OptionProps {
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
}

/** Flattens option labels like `{name}{phone ? ` · ${phone}` : ''}` into text. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeToText(node.props.children);
  return '';
}

function toOptions(children: ReactNode): ComboboxOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionProps>(child)) return [];
    return [
      {
        value: String(child.props.value ?? ''),
        label: nodeToText(child.props.children),
        disabled: child.props.disabled,
      },
    ];
  });
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  onChange?: (event: { target: { value: string } }) => void;
  /** Visual density. */
  size?: 'sm' | 'md';
}

/**
 * Custom dropdown used everywhere instead of a native `<select>`.
 *
 * Keeps the familiar `<option>` children API (so existing forms only change the
 * import), but renders an accessible listbox with a properly aligned chevron
 * and automatic search for long lists.
 */
export function Select({ className = '', children, onChange, size = 'md', ...props }: SelectProps) {
  const options = toOptions(children);
  const value = props.value === undefined ? '' : String(props.value);

  return (
    <Combobox
      id={props.id}
      value={value}
      onChange={(next) => onChange?.({ target: { value: next } })}
      options={options}
      disabled={props.disabled}
      aria-label={props['aria-label']}
      aria-invalid={props['aria-invalid'] === true || props['aria-invalid'] === 'true'}
      aria-describedby={props['aria-describedby']}
      className={className}
      size={size}
    />
  );
}
