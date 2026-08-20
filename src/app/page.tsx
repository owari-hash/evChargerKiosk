import { StationCard } from '@/components/stations/station-card';
import { StationQuickSearch } from '@/components/stations/station-finder';
import { Alert, ButtonLink } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { listStations, type StationResult } from '@/lib/csms/stations';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

export default async function HomePage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);

  const steps = [
    { title: d.home.step1Title, body: d.home.step1Body },
    { title: d.home.step2Title, body: d.home.step2Body },
    { title: d.home.step3Title, body: d.home.step3Body },
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
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            {publicEnv.brandName}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {d.home.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            {d.home.subtitle}
          </p>
          <StationQuickSearch className="mt-8 max-w-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {d.home.networkTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {d.home.networkSubtitle}
            </p>
          </div>
          <ButtonLink href="/stations" variant="secondary">
            {d.home.seeAll}
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
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {d.home.howItWorks}
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-xl bg-brand-soft text-sm font-semibold text-brand-strong"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {!user && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl bg-surface p-6 ring-1 ring-border shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {d.home.ctaTitle}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{d.home.ctaBody}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/register" size="lg">
                {d.common.createAccount}
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                {d.common.signIn}
              </ButtonLink>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
