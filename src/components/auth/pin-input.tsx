'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
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
 * A centred row of digit boxes backed by one real, invisible input laid over
 * them, so typing, deleting, pasting and SMS code autofill all behave natively.
 * Each box fills with the brand colour and pops as its digit goes in; a new
 * error shakes the row.
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
  const [shaking, setShaking] = useState(false);
  const digits = value.slice(0, length).split('');
  const active = Math.min(digits.length, length - 1);
  const invalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';

  const wasInvalid = useRef(invalid);
  useEffect(() => {
    // Shake when an error appears, not on every render while it is shown.
    // The class is added from a timer so this is not a synchronous setState
    // inside the effect.
    if (invalid && !wasInvalid.current) {
      const timer = setTimeout(() => setShaking(true), 0);
      wasInvalid.current = invalid;
      return () => clearTimeout(timer);
    }
    wasInvalid.current = invalid;
  }, [invalid]);

  return (
    <div className={cn('flex w-full justify-center', className)}>
      <div
        className={cn(
          'relative inline-flex',
          length > 4 ? 'gap-1.5 sm:gap-2.5' : 'gap-2 sm:gap-3',
          disabled && 'opacity-60',
          shaking && 'pin-shake',
        )}
        onAnimationEnd={(event) => {
          if (event.animationName === 'pin-shake') setShaking(false);
        }}
      >
        {Array.from({ length }, (_, index) => {
          const digit = digits[index];
          const filled = digit !== undefined;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'pin-cell flex items-center justify-center rounded-xl sm:rounded-2xl font-semibold',
                length > 4
                  ? 'w-9 sm:w-11 md:w-12 h-12 sm:h-14 text-lg sm:text-xl'
                  : 'w-11 sm:w-13 md:w-14 h-13 sm:h-14 text-xl',
                filled
                  ? 'is-filled bg-brand text-brand-contrast ring-1 ring-brand'
                  : 'bg-surface text-foreground',
                !filled &&
                  (invalid
                    ? 'ring-2 ring-danger'
                    : focused && index === active
                      ? 'ring-2 ring-brand'
                      : 'ring-1 ring-border'),
                filled && invalid && 'ring-2 ring-danger',
              )}
            >
              {filled ? (masked ? <span className="size-3 rounded-full bg-current" /> : digit) : null}
            </span>
          );
        })}
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
    </div>
  );
}
