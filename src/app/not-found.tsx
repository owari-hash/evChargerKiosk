import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
import { getTranslations } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Хуудас олдсонгүй',
};

export default async function NotFound() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <Image src="/eplug-mark.png" alt="" aria-hidden width={56} height={56} className="size-14 rounded-2xl shadow-sm" />

      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">
        {d.errors.notFoundCode}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {d.errors.notFoundTitle}
      </h1>
      <p className="mt-3 max-w-md text-base text-muted">
        {d.errors.notFoundBody}
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink href="/stations" size="lg">
          {d.stations.title}
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" size="lg">
          {d.errors.goHome}
        </ButtonLink>
      </div>

      <p className="mt-8 text-sm text-muted">
        {d.errors.stillStuck}{' '}
        <Link href="/help" className="font-medium text-brand hover:underline">
          {d.errors.readHelp}
        </Link>
      </p>
    </div>
  );
}
