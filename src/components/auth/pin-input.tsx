'use client';

import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'maxLength' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  /** How many digits: 4 for a PIN, 6 for an SMS code. */
  length?: number;
  /** Shows dots instead of the digits, for a PIN. */
  masked?: boolean;
}

/**
 * A row of digit boxes backed by one real, invisible input laid over them, so
 * typing, deleting, pasting and SMS code autofill all behave natively.
 */
export function PinInput({
  value,
  onChange,
  length = 4,
  masked = false,
  className,
  disabled,
  onFocus,
  onBlur,
  ...rest
}: PinInputProps) {
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, length).split('');
  const active = Math.min(digits.length, length - 1);
  const invalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';

  return (
    <div className={cn('relative inline-flex gap-2.5', disabled && 'opacity-60', className)}>
      {Array.from({ length }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'flex h-14 w-11 items-center justify-center rounded-xl bg-surface text-xl font-semibold text-foreground transition sm:w-12',
            invalid
              ? 'ring-2 ring-danger'
              : focused && index === active
                ? 'ring-2 ring-brand'
                : 'ring-1 ring-border',
          )}
        >
          {digits[index] ? (masked ? '•' : digits[index]) : null}
        </span>
      ))}
      <input
        autoComplete="off"
        {...rest}
        type="text"
        inputMode="numeric"
        pattern={`[0-9]{${length}}`}
        maxLength={length}
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
