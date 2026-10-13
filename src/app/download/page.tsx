import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { appLinks } from '@/lib/app-links';
import { getTranslations } from '@/lib/i18n';
import { responsiveQr } from '@/lib/qr';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return {
    title: d.download.metaTitle,
    description: d.download.metaDescription,
  };
}

export default async function DownloadPage() {
  const { d } = await getTranslations();

  // Generated together so the three codes land in the same render pass.
  const [iosQr, androidQr, webQr] = await Promise.all([
    responsiveQr(appLinks.ios),
    responsiveQr(appLinks.android),
    responsiveQr(appLinks.web),
  ]);

  const webHost = appLinks.web.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {d.download.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-base text-muted">
          {d.download.subtitle}
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-3">
        <QrCard
          id="ios"
          icon={<AppleIcon />}
          name={d.download.ios.name}
          store={d.download.ios.store}
          note={d.download.ios.note}
          qr={iosQr}
          href={appLinks.ios}
          action={d.download.openOnThisDevice}
          scanHint={d.download.scanHint}
        />
        <QrCard
          id="android"
          icon={<AndroidIcon />}
          name={d.download.android.name}
          store={d.download.android.store}
          note={d.download.android.note}
          qr={androidQr}
          href={appLinks.android}
          action={d.download.openOnThisDevice}
          scanHint={d.download.scanHint}
        />
        <QrCard
          id="web"
          icon={<GlobeIcon />}
          name={d.download.web.name}
          store={d.download.web.store}
          note={d.download.web.note}
          qr={webQr}
          href={appLinks.web}
          action={d.download.openOnThisDevice}
          scanHint={d.download.scanHint}
          highlight
          footer={
            <p className="text-center text-xs text-muted">
              {d.download.orType}{' '}
              <span className="font-mono font-semibold text-foreground">{webHost}</span>
            </p>
          }
        />
      </div>
    </div>
  );
}

interface QrCardProps {
  id: string;
  icon: ReactNode;
  name: string;
  store: string;
  note: string;
  /** Pre-rendered inline SVG from `responsiveQr`. */
  qr: string;
  href: string;
  action: string;
  scanHint: string;
  highlight?: boolean;
  footer?: ReactNode;
}

function QrCard({
  id,
  icon,
  name,
  store,
  note,
  qr,
  href,
  action,
  scanHint,
  highlight = false,
  footer,
}: QrCardProps) {
  return (
    <section
      id={id}
      className={cn(
        'flex scroll-mt-24 flex-col rounded-2xl bg-surface p-6 ring-1 shadow-[var(--shadow-card)]',
        highlight ? 'ring-brand/35' : 'ring-border',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{name}</h2>
          <p className="truncate text-sm text-muted">{store}</p>
        </div>
      </div>

      {/* The code is always dark on white, in both themes — see lib/qr.ts. */}
      <div className="mt-6 self-center rounded-2xl bg-white p-3 ring-1 ring-black/10">
        <div
          className="size-44 sm:size-48"
          role="img"
          aria-label={`${name} — ${scanHint}`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>

      <p className="mt-3 text-center text-xs font-medium text-muted">{scanHint}</p>

      <p className="mt-4 text-pretty text-center text-sm text-muted">{note}</p>

      <div className="mt-5 flex flex-col gap-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition',
            highlight
              ? 'bg-brand text-brand-contrast hover:bg-brand-strong'
              : 'bg-surface-muted text-foreground ring-1 ring-border hover:bg-background',
          )}
        >
          {action}
        </a>
        {footer}
      </div>
    </section>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.47 2.26-1.24 3.08-.83.88-2.19 1.56-3.33 1.47-.14-1.1.44-2.27 1.2-3.04.84-.87 2.3-1.52 3.37-1.51zM20.5 17.2c-.55 1.26-.81 1.82-1.52 2.94-.99 1.56-2.38 3.5-4.11 3.52-1.54.01-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33-2.76-4.43-3.05-9.55-1.34-12.27 1.21-1.93 3.12-3.06 4.92-3.06 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.36-1.01 4.48-1.01 1.6 0 3.3.87 4.51 2.38-3.96 2.17-3.32 7.83.69 8.82z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.14-.52.38.38 0 0 0-.52.14l-1.86 3.22a11.4 11.4 0 0 0-8.84 0L6.22 5.92a.38.38 0 0 0-.52-.14.38.38 0 0 0-.14.52L7.4 9.48A10.2 10.2 0 0 0 2 18.1h20a10.2 10.2 0 0 0-4.4-8.62zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  );
}
