import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * A phone number field with the country code fixed in front. The driver types
 * the local number; the API adds the code, so a pasted +976 number works too.
 */
export function PhoneInput({ className, ...rest }: Omit<ComponentProps<'input'>, 'type'>) {
  const invalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';

  return (
    <div
      className={cn(
        'flex h-14 items-center rounded-2xl bg-surface transition focus-within:ring-2',
        invalid ? 'ring-2 ring-danger' : 'ring-1 ring-border focus-within:ring-brand',
        className,
      )}
    >
      <span className="pl-4 pr-3 text-base font-semibold text-foreground">+976</span>
      <span aria-hidden className="h-6 w-px bg-border" />
      <input
        {...rest}
        type="tel"
        inputMode="tel"
        className="h-full min-w-0 flex-1 rounded-r-2xl bg-transparent px-3 text-base tracking-wide text-foreground placeholder:text-muted/60 auth-plain-input"
      />
    </div>
  );
}
