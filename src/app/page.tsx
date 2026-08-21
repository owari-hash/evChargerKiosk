import { StationCard } from '@/components/stations/station-card';
import { StationQuickSearch } from '@/components/stations/station-finder';
import { Alert, ButtonLink } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { listStations, type StationResult } from '@/lib/csms/stations';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

export default async function HomePage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);

  const features = [
    {
      title: d.home.feature1Title,
      body: d.home.feature1Body,
      icon: (
        <svg viewBox="0 0 24 24" className="size-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: d.home.feature2Title,
      body: d.home.feature2Body,
      icon: (
        <svg viewBox="0 0 24 24" className="size-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: d.home.feature3Title,
      body: d.home.feature3Body,
      icon: (
        <svg viewBox="0 0 24 24" className="size-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: d.home.feature4Title,
      body: d.home.feature4Body,
      icon: (
        <svg viewBox="0 0 24 24" className="size-6 text-brand" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const steps = [
    { title: d.home.step1Title, body: d.home.step1Body, badge: '01' },
    { title: d.home.step2Title, body: d.home.step2Body, badge: '02' },
    { title: d.home.step3Title, body: d.home.step3Body, badge: '03' },
  ];

  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({ limit: 6 });
  } catch (err) {
    console.error('[home] failed to load stations', err);
    loadError = d.errors.networkUnreachable;
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-soft/30 via-surface to-surface py-16 sm:py-24">
        {/* Glow ambient decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 blur-3xl"
        >
          <div className="h-[400px] w-[700px] rounded-full bg-gradient-to-tr from-brand/20 via-brand-strong/10 to-transparent opacity-60" />
        </div>

        <div className="mx-auto max-w-6xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-brand"></span>
            </span>
            <span>{publicEnv.brandName}</span>
            <span className="text-muted">·</span>
            <span>{d.home.heroBadge}</span>
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.15]">
            {d.home.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted sm:text-xl leading-relaxed">
            {d.home.subtitle}
          </p>

          {/* Quick Search Widget Container */}
          <div className="mt-8 max-w-3xl rounded-2xl bg-surface/90 p-3 ring-1 ring-border shadow-xl backdrop-blur-md">
            <StationQuickSearch />
          </div>

          {/* Stat highlights */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-3xl">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand font-bold">
                ⚡
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted font-medium truncate">{d.home.statFastTitle}</p>
                <p className="text-sm font-bold text-foreground truncate">{d.home.statFastValue}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand font-bold">
                🟢
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted font-medium truncate">{d.home.statLiveTitle}</p>
                <p className="text-sm font-bold text-foreground truncate">{d.home.statLiveValue}</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand font-bold">
                💳
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted font-medium truncate">{d.home.statPayTitle}</p>
                <p className="text-sm font-bold text-foreground truncate">{d.home.statPayValue}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Stations Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {d.home.networkTitle}
            </h2>
            <p className="mt-1.5 text-sm text-muted max-w-xl">
              {d.home.networkSubtitle}
            </p>
          </div>
          <ButtonLink href="/stations" variant="secondary" size="md">
            {d.home.seeAll} →
          </ButtonLink>
        </div>

        {result.demo && result.warning && (
          <Alert tone="warning" title={d.errors.sampleData} className="mt-6">
            {result.warning}
          </Alert>
        )}

        {loadError && (
          <Alert tone="danger" title={d.errors.stationsFailed} className="mt-6">
            {loadError}
          </Alert>
        )}

        {result.stations.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.stations.map((station) => (
              <li key={station.id}>
                <StationCard station={station} />
              </li>
            ))}
          </ul>
        ) : (
          !loadError && (
            <p className="mt-6 text-sm text-muted">{d.home.noStations}</p>
          )
        )}
      </section>

      {/* Features Showcase Section */}
      <section className="border-t border-border bg-surface-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              {d.home.featuresBadge}
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {d.home.featuresTitle}
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item) => (
              <div
                key={item.title}
                className="group relative rounded-2xl bg-surface p-6 ring-1 ring-border shadow-sm transition hover:shadow-md hover:ring-brand/40"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-brand-soft group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                {d.home.howItWorksBadge}
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {d.home.howItWorks}
              </h2>
            </div>
          </div>

          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.title}
                className="relative rounded-2xl bg-surface-muted/50 p-6 ring-1 ring-border shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block rounded-xl bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                    {step.badge}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA Banner */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-soft via-surface to-brand-soft p-8 ring-1 ring-brand/20 shadow-xl sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {d.home.ctaTitle}
              </h2>
              <p className="mt-3 text-sm text-muted sm:text-base leading-relaxed">
                {d.home.ctaBody}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/register" size="lg">
                  {d.common.createAccount}
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" size="lg">
                  {d.common.signIn}
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

