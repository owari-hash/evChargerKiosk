'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { d } = useI18n();

  useEffect(() => {
    console.error('[app] unhandled error', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-surface-muted text-2xl text-warning"
      >
        ⚠
      </span>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {d.errors.errorTitle}
      </h1>
      <p className="mt-3 max-w-md text-base text-muted" role="alert">
        {d.errors.errorBody}
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:flex-row">
        <Button type="button" size="lg" onClick={reset}>
          {d.common.retry}
        </Button>
        <ButtonLink href="/stations" variant="secondary" size="lg">
          {d.stations.title}
        </ButtonLink>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-muted">
          {format(d.errors.reference, { digest: error.digest })}
        </p>
      )}

      <p className="mt-4 text-sm text-muted">
        <Link href="/help" className="font-medium text-brand hover:underline">
          {d.errors.helpContact}
        </Link>
      </p>
    </div>
  );
}
