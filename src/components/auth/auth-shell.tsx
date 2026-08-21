import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl';
}

/** Centred card layout shared by sign-in, sign-up and the recovery screens. */
export function AuthShell({ title, subtitle, children, footer, maxWidth = 'md' }: AuthShellProps) {
  const widthClass = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className={`mx-auto w-full ${widthClass}`}>
        <header className="mb-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </header>

        <Card className="p-5 sm:p-7 shadow-lg border border-border/80 bg-surface/90 backdrop-blur-sm">
          {children}
        </Card>

        {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** Placeholder shown while a form that reads the query string hydrates. */
export function AuthFormFallback({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <span className="sr-only">{getDictionary('mn').auth.loadingForm}</span>
      <div className="animate-pulse space-y-5" aria-hidden>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 w-28 rounded bg-surface-muted" />
            <div className="h-11 rounded-xl bg-surface-muted" />
          </div>
        ))}
        <div className="h-12 rounded-xl bg-surface-muted" />
      </div>
    </>
  );
}

/**
 * Only same-origin paths may be used as a post-login destination. Anything absolute
 * ("https://evil.example") or protocol-relative ("//evil.example", "/\evil.example")
 * falls back, so a crafted ?next= cannot bounce a signed-in driver off the site.
 */
export function sanitizeNext(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

/**
 * Wires an input to the id-based hint/error paragraphs that `Field` renders.
 * Pass `hasHint` when the field also supplies a hint.
 */
export function fieldAria(id: string, error?: string, hasHint = false) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  };
}
