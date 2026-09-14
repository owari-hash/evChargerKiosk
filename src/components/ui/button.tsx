import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'pill';

// The corner radius lives with each size rather than here: `cn` only joins
// classes, so two radius utilities on one element would fight.
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold transition duration-150 ' +
  'active:scale-[0.98] motion-reduce:active:scale-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 whitespace-nowrap';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-contrast hover:bg-brand-strong shadow-sm',
  secondary: 'bg-surface text-foreground ring-1 ring-border hover:bg-surface-muted',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-xl px-4 text-sm',
  lg: 'h-12 rounded-xl px-6 text-base',
  /** The sign-in and sign-up call to action, matching the app. */
  pill: 'h-14 rounded-full px-6 text-base',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      aria-busy={loading || undefined}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
