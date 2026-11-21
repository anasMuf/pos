import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Force the search field on/off. Defaults to on when there are 8+ options. */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  searchPlaceholder?: string;
  emptyLabel?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
} as const;

/**
 * Accessible custom dropdown (listbox pattern) with an optional search field.
 *
 * Replaces native `<select>` so the chevron is always inside the control and the
 * popup can show descriptions/empty states. Long lists (8+ options) search
 * automatically so cashiers never scroll blindly.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi',
  searchable,
  disabled,
  className = '',
  size = 'md',
  searchPlaceholder = 'Cari…',
  emptyLabel = 'Tidak ada hasil',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: ComboboxProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const withSearch = searchable ?? options.length >= 8;
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        (option.description ?? '').toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term),
    );
  }, [options, query]);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    if (withSearch) searchRef.current?.focus();
  }, [open, withSearch]);

  useEffect(() => {
    if (!open) return;
    const index = filtered.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
  }, [open, filtered, value]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  const commit = (option: ComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(Math.max(filtered.length - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option) commit(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`
          flex w-full items-center justify-between gap-2 rounded-md bg-white text-left text-gray-900
          outline-1 -outline-offset-1 outline-gray-300
          focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
          ${SIZE_CLASSES[size]}
        `}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-30 mt-1 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/5">
          {withSearch && (
            <div className="relative border-b border-gray-100 p-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listboxId}
                className="block w-full rounded px-2 py-1.5 pl-7 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-200 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
              />
            </div>
          )}

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-500">{emptyLabel}</p>
            )}
            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled on the trigger and search inputs
                // biome-ignore lint/a11y/useFocusableInteractive: focus intentionally stays on the trigger/search input
                <div
                  key={option.value}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option)}
                  className={`
                    flex cursor-pointer items-start justify-between gap-2 px-3 py-2 text-sm
                    ${option.disabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-900'}
                    ${isActive && !option.disabled ? 'bg-indigo-50' : ''}
                  `}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
