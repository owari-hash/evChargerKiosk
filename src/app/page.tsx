import { StationCard } from '@/components/stations/station-card';
import { HeroMapSection } from '@/components/stations/hero-map-section';
import { toMapStations } from '@/components/stations/map-station';
import { Alert, ButtonLink } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { listStations, type StationResult } from '@/lib/csms/stations';
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

  // One load serves both the hero map and the featured cards below it.
  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({ limit: 200 });
  } catch (err) {
    console.error('[home] failed to load stations', err);
    loadError = d.errors.networkUnreachable;
  }

  const mapStations = toMapStations(result.stations);
  const featured = result.stations.slice(0, 6);

  return (
    <>
      {/* Hero — the live network map is the landing surface */}
      <section className="relative border-b border-border">
        {/* The map carries the page visually, so the page heading lives here for
            the document outline, screen readers and crawlers. */}
        <h1 className="sr-only">{d.home.title}</h1>
        <HeroMapSection
          stations={mapStations}
          className="h-[calc(100svh-4rem)] min-h-[520px]"
        />
      </section>

      {/* Network Stations Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {d.home.networkTitle}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
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

        {featured.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((station) => (
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
          <div className="mx-auto max-w-2xl text-center">
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
                className="group relative rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border transition hover:shadow-md hover:ring-brand/40"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-brand-soft transition-transform group-hover:scale-105">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
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
                className="relative flex flex-col justify-between rounded-2xl bg-surface-muted/50 p-6 shadow-sm ring-1 ring-border"
              >
                <div>
                  <span className="inline-block rounded-xl bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                    {step.badge}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA Banner */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-soft via-surface to-brand-soft p-8 shadow-xl ring-1 ring-brand/20 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {d.home.ctaTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
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
