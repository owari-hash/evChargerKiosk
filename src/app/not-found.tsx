import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-2xl text-brand-strong"
      >
        ⚡
      </span>

      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md text-base text-muted">
        The link may be out of date, or the charge point it pointed at is no longer published.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink href="/stations" size="lg">
          Find a charger
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" size="lg">
          Go to the home page
        </ButtonLink>
      </div>

      <p className="mt-8 text-sm text-muted">
        Still stuck?{' '}
        <Link href="/help" className="font-medium text-brand hover:underline">
          Read the help page
        </Link>
        .
      </p>
    </div>
  );
}
