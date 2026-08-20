import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { listStations } from '@/lib/csms/stations';
import type { Station } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Charging is billed per kilowatt-hour. Each charge point has its own tariff, set by the operator and shown before you plug in.',
};

// Tariffs are read live from the CSMS, so this page must not be cached at build time.
export const dynamic = 'force-dynamic';

interface TariffData {
  stations: Station[];
  demo: boolean;
  warning?: string;
  failed: boolean;
}

async function loadTariffs(): Promise<TariffData> {
  try {
    const { stations, demo, warning } = await listStations({ limit: 200 });
    return { stations, demo, warning, failed: false };
  } catch (err) {
    console.error('[pricing] could not load tariffs', err);
    return { stations: [], demo: false, failed: true };
  }
}

export default async function PricingPage() {
  const { stations, demo, warning, failed } = await loadTariffs();
  const priced = stations.filter((s) => typeof s.tariffPerKwh === 'number');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Pricing</h1>
        <p className="mt-3 text-base text-muted">
          You pay for the energy you take, measured in kilowatt-hours. There is no single network
          price: every charge point carries its own tariff, set by the operator who runs it. The
          tariff that applies to you is always shown on the station page before you start.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How a charge is priced</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-foreground">Energy, not time</dt>
                <dd className="mt-1 text-muted">
                  The charge point meters how much energy your car actually accepted. The cost of a
                  session is that figure multiplied by the tariff of the charge point.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">The tariff is per charge point</dt>
                <dd className="mt-1 text-muted">
                  Operators set it individually, so a fast roadside charger and a slow one in a car
                  park will not cost the same. A charge point with no tariff configured shows a dash
                  instead of a price.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Shown before you plug in</dt>
                <dd className="mt-1 text-muted">
                  Open a station from{' '}
                  <Link href="/stations" className="font-medium text-brand hover:underline">
                    Find a charger
                  </Link>{' '}
                  to see its current tariff, plug types and live availability.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Recorded on your session</dt>
                <dd className="mt-1 text-muted">
                  Where the operator has configured a tariff, the cost of each completed session is
                  stored with it and appears in your charging history.
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What this app does not do</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm text-muted">
              <li>
                There are no subscriptions, memberships or prepaid bundles to buy here. Nothing on
                this site is for sale.
              </li>
              <li>
                This app does not take payments. Billing is arranged by the network operator through
                whatever method they have agreed with you.
              </li>
              <li>
                Parking charges, if the site owner levies any, are separate from the charging tariff
                and are not shown here.
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Current tariffs</h2>
            <p className="mt-1 text-sm text-muted">
              {priced.length > 0
                ? `${priced.length} of ${stations.length} charge points publish a price per kilowatt-hour.`
                : 'Prices are published by each operator as they configure their charge points.'}
            </p>
          </div>
          <ButtonLink href="/stations" variant="secondary" size="md">
            Find a charger
          </ButtonLink>
        </div>

        {demo && (
          <Alert tone="warning" title="Sample data" className="mt-4">
            {warning ??
              'The charging network is not reachable, so the prices below come from the built-in demo network. They are not real tariffs.'}
          </Alert>
        )}

        {failed && (
          <Alert tone="danger" title="Tariffs unavailable" className="mt-4">
            We could not reach the charging network to read current prices. Please try again in a
            few minutes.
          </Alert>
        )}

        {!failed && stations.length === 0 && (
          <Alert tone="info" className="mt-4">
            No charge points are published yet, so there is nothing to price.
          </Alert>
        )}

        {stations.length > 0 && (
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <caption className="sr-only">
                  Charge points with their price per kilowatt-hour and maximum power
                </caption>
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3">
                      Charge point
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Plugs
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Max power
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Price per kWh
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station.id} className="border-b border-border last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <Link
                          href={`/stations/${encodeURIComponent(station.id)}`}
                          className="text-foreground hover:text-brand hover:underline"
                        >
                          {station.name}
                        </Link>
                        {station.address && (
                          <span className="mt-0.5 block text-xs font-normal text-muted">
                            {station.address}
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-3 text-muted">
                        {station.connectorTypes.length ? station.connectorTypes.join(' · ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {station.maxPowerKw ? `${station.maxPowerKw} kW` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatMoney(station.tariffPerKwh)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="mt-4 text-xs text-muted">
          Prices are read from the charging network each time this page loads. An operator can change
          a tariff at any time; the figure shown on the station page immediately before you start is
          the one that applies.
        </p>
      </section>
    </div>
  );
}
