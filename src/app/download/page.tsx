import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { appLinks } from '@/lib/app-links';
import { listStations } from '@/lib/driver-api';
import { getTranslations, type Dictionary } from '@/lib/i18n';
import { responsiveQr } from '@/lib/qr';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return {
    title: d.download.metaTitle,
    description: d.download.metaDescription,
  };
}

export default async function DownloadPage() {
  const [{ d }, stationStats, universalQr] = await Promise.all([
    getTranslations(),
    listStations({ limit: 200 })
      .then(({ stations }) => ({
        stations: stations.length,
        connectors: stations.reduce((sum, s) => sum + s.totalConnectors, 0),
      }))
      .catch(() => null),
    responsiveQr(appLinks.universal),
  ]);

  const webHost = appLinks.web.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Hero d={d} stats={stationStats} />

      <div id="get" className="mx-auto mt-6 max-w-lg scroll-mt-24 sm:mt-8">
        <h2 className="text-balance text-center text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {d.download.title}
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-muted">
          Утасныхаа камераар QR кодыг уншуулж апп татна уу
        </p>
      </div>

      {/* Unified Dynamic Smart QR Card */}
      <section className="mx-auto mt-6 max-w-md rounded-2xl bg-surface p-5 sm:p-6 ring-1 ring-border shadow-sm text-center">
        {/* Badges & OS icons */}
        <div className="flex items-center justify-center gap-2">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground ring-1 ring-border"
          >
            <AppleIcon />
          </span>
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground ring-1 ring-border"
          >
            <AndroidIcon />
          </span>
        </div>

        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/20">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            iOS & Android автоматаар танина
          </span>
        </div>

        {/* The single dynamic QR code */}
        <div className="mt-4 inline-block rounded-2xl bg-white p-3 ring-1 ring-black/10 shadow-sm">
          <div
            className="aspect-square w-48 sm:w-56"
            role="img"
            aria-label="Eplug апп татах ухаалаг QR код"
            dangerouslySetInnerHTML={{ __html: universalQr }}
          />
        </div>

        <p className="mt-3 text-pretty text-xs text-muted leading-relaxed max-w-xs mx-auto">
          Камераар уншуулснаар таны утасны төрлөөс (iOS эсвэл Android) хамааран App Store эсвэл Google Play рүү автоматаар шилжинэ.
        </p>

        {/* Direct Download Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 border-t border-border">
          <a
            href={appLinks.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl bg-surface-muted px-3.5 py-2.5 text-left ring-1 ring-border transition hover:bg-background hover:ring-foreground/20"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-foreground shadow-xs">
              <AppleIcon />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold leading-tight text-foreground">App Store</span>
                <span className="text-[10px] font-medium text-brand">Татах</span>
              </div>
              <p className="truncate text-[10px] text-muted">iOS 13+</p>
            </div>
          </a>

          <a
            href={appLinks.android}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl bg-surface-muted px-3.5 py-2.5 text-left ring-1 ring-border transition hover:bg-background hover:ring-foreground/20"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-foreground shadow-xs">
              <AndroidIcon />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold leading-tight text-foreground">Google Play</span>
                <span className="text-[10px] font-medium text-brand">Татах</span>
              </div>
              <p className="truncate text-[10px] text-muted">Android 7.0+</p>
            </div>
          </a>
        </div>
      </section>

      <WebStrip
        id="web"
        name={d.download.web.name}
        note={d.download.web.note}
        host={webHost}
        action={d.download.web.goToHomepage}
      />

      <Guide guide={d.download.guide} />
    </div>
  );
}

/**
 * The marketing split: pitch and the two CTAs on the left, a mock of the
 * app's own home screen on the right. `stats` is null if the station list
 * could not be reached — the row of counts just does not render then, rather
 * than show a made-up number.
 */
function Hero({ d, stats }: { d: Dictionary; stats: { stations: number; connectors: number } | null }) {
  const t = d.download;

  return (
    <section className="relative flex flex-col items-center overflow-hidden px-4 py-16 text-center sm:py-24">
      <div className="auth-rise relative">
        <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-7xl">
          {t.heroTitleStart}
          <br />
          <span className="text-brand">{t.heroTitleHighlight}</span> {t.heroTitleEnd}
        </h1>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#get"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition hover:opacity-85 sm:w-auto"
          >
            {t.heroCtaPrimary}
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0-5-5m5 5-5 5" />
            </svg>
          </a>
          <Link
            href="/stations"
            className="inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface-muted sm:w-auto"
          >
            {t.heroCtaSecondary}
          </Link>
        </div>

        {stats && (
          <dl className="mt-8 flex items-center justify-center gap-8">
            <div>
              <dt className="sr-only">{t.heroStatStations}</dt>
              <dd className="text-2xl font-bold tabular-nums text-foreground">{stats.stations}</dd>
              <p className="text-xs text-muted">{t.heroStatStations}</p>
            </div>
            <span aria-hidden className="h-8 w-px bg-border" />
            <div>
              <dt className="sr-only">{t.heroStatConnectors}</dt>
              <dd className="text-2xl font-bold tabular-nums text-foreground">{stats.connectors}</dd>
              <p className="text-xs text-muted">{t.heroStatConnectors}</p>
            </div>
          </dl>
        )}
      </div>

      {/* A single, understated wash of light behind the headline. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">
        <div className="size-[42rem] rounded-full bg-[radial-gradient(circle,rgb(16_185_129/0.16),transparent_62%)] blur-3xl" />
      </div>
    </section>
  );
}

/**
 * The website is the fallback for anyone who does not want to install anything,
 * so it sits below the two stores as a single quiet row rather than a third card.
 */
function WebStrip({
  id,
  name,
  note,
  host,
  action,
  href = '/stations',
}: {
  id: string;
  name: string;
  note: string;
  host: string;
  action: string;
  href?: string;
}) {
  return (
    <section
      id={id}
      className="mx-auto mt-4 flex max-w-md scroll-mt-24 flex-col gap-2.5 rounded-xl bg-surface px-3.5 py-3 ring-1 ring-border sm:flex-row sm:items-center sm:gap-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-muted text-muted"
        >
          <GlobeIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
            <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{host}</span>
          </p>
          <p className="mt-0.5 text-pretty text-[11px] leading-snug text-muted">{note}</p>
        </div>
      </div>

      <Link
        href={href}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90"
      >
        {action}
      </Link>
    </section>
  );
}

/**
 * The whole journey in order, so a driver standing at a kiosk can read what
 * happens from installing the app to collecting the tax receipt.
 */
function Guide({ guide }: { guide: Dictionary['download']['guide'] }) {
  const steps = [
    { title: guide.s1Title, body: guide.s1Body },
    { title: guide.s2Title, body: guide.s2Body },
    { title: guide.s3Title, body: guide.s3Body },
    { title: guide.s4Title, body: guide.s4Body },
    { title: guide.s5Title, body: guide.s5Body },
    { title: guide.s6Title, body: guide.s6Body },
    { title: guide.s7Title, body: guide.s7Body },
    { title: guide.s8Title, body: guide.s8Body },
    { title: guide.s9Title, body: guide.s9Body },
  ];

  return (
    <section id="guide" className="mx-auto mt-14 max-w-3xl scroll-mt-24 sm:mt-16">
      <header className="text-center">
        <h2 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {guide.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted">{guide.subtitle}</p>
      </header>

      <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-strong tabular-nums"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-0.5 text-pretty text-[13px] leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.47 2.26-1.24 3.08-.83.88-2.19 1.56-3.33 1.47-.14-1.1.44-2.27 1.2-3.04.84-.87 2.3-1.52 3.37-1.51zM20.5 17.2c-.55 1.26-.81 1.82-1.52 2.94-.99 1.56-2.38 3.5-4.11 3.52-1.54.01-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33-2.76-4.43-3.05-9.55-1.34-12.27 1.21-1.93 3.12-3.06 4.92-3.06 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.36-1.01 4.48-1.01 1.6 0 3.3.87 4.51 2.38-3.96 2.17-3.32 7.83.69 8.82z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.14-.52.38.38 0 0 0-.52.14l-1.86 3.22a11.4 11.4 0 0 0-8.84 0L6.22 5.92a.38.38 0 0 0-.52-.14.38.38 0 0 0-.14.52L7.4 9.48A10.2 10.2 0 0 0 2 18.1h20a10.2 10.2 0 0 0-4.4-8.62zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
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
