import { HeroMapSection } from '@/components/stations/hero-map-section';
import { toMapStations } from '@/components/stations/map-station';
import { ButtonLink } from '@/components/ui';
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

  let result: StationResult = { stations: [], demo: false };
  try {
    result = await listStations({ limit: 200 });
  } catch (err) {
    console.error('[home] failed to load stations', err);
  }

  const mapStations = toMapStations(result.stations);

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

        <a
          href="#features"
          aria-label={d.home.scrollDown}
          title={d.home.scrollDown}
          className="absolute inset-x-0 -bottom-6 z-30 flex justify-center"
        >
          <span className="grid size-12 animate-bounce place-items-center rounded-full bg-surface text-foreground shadow-[0_10px_28px_-10px_rgb(2_6_23/0.5)] ring-1 ring-border transition hover:bg-surface-muted">
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </a>
      </section>

      {/* Features Showcase Section */}
      <section id="features" className="border-t border-border bg-surface-muted/40 py-16 scroll-mt-20">
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
