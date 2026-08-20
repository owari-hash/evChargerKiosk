import { StationCard } from '@/components/stations/station-card';
import { StationQuickSearch } from '@/components/stations/station-finder';
import { Alert, ButtonLink } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { listStations, type StationResult } from '@/lib/csms/stations';
import { publicEnv } from '@/lib/env';

const STEPS = [
  {
    title: 'Find a charger',
    body: 'Search by place or share your location to see what is free right now, with live plug status from every charge point.',
  },
  {
    title: 'Plug in',
    body: 'Hold your charge tag against the reader, or start the session from your phone where the station supports it.',
  },
  {
    title: 'Track and pay',
    body: 'Watch energy, power and cost while you charge, and keep every receipt in your account history.',
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({ limit: 6 });
  } catch (err) {
    console.error('[home] failed to load stations', err);
    loadError = 'The charging network is not reachable right now. Please try again shortly.';
  }

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            {publicEnv.brandName}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Charge where you are already going.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            Live plug availability, clear pricing and directions for every charge point on the
            network.
          </p>
          <StationQuickSearch className="mt-8 max-w-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Chargers on the network
            </h2>
            <p className="mt-1 text-sm text-muted">
              A snapshot of the network. Open the finder to filter by connector, power and distance.
            </p>
          </div>
          <ButtonLink href="/stations" variant="secondary">
            See all chargers
          </ButtonLink>
        </div>

        {result.demo && result.warning && (
          <Alert tone="warning" title="Sample data" className="mt-6">
            {result.warning}
          </Alert>
        )}

        {loadError && (
          <Alert tone="danger" title="Stations could not be loaded" className="mt-6">
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
            <p className="mt-6 text-sm text-muted">
              No charge points are being reported right now. Please try again shortly.
            </p>
          )
        )}
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How it works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
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
              Create a free account
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Link your charge tag, follow live sessions from your phone and keep every receipt in
              one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/register" size="lg">
                Create account
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                Sign in
              </ButtonLink>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
