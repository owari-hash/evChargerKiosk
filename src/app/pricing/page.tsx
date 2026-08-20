import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { listStations } from '@/lib/csms/stations';
import { format, getTranslations } from '@/lib/i18n';
import type { Station } from '@/lib/types';
import { formatMoney, formatPowerKw, intlLocale } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.pricing.metaTitle, description: d.pricing.metaDescription };
}

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
  const [{ stations, demo, warning, failed }, { locale, d }] = await Promise.all([
    loadTariffs(),
    getTranslations(),
  ]);
  const intl = intlLocale(locale);
  const priced = stations.filter((s) => typeof s.tariffPerKwh === 'number');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {d.pricing.title}
        </h1>
        <p className="mt-3 text-base text-muted">{d.pricing.intro}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{d.pricing.howTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-foreground">{d.pricing.energyTitle}</dt>
                <dd className="mt-1 text-muted">{d.pricing.energyBody}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{d.pricing.perPointTitle}</dt>
                <dd className="mt-1 text-muted">{d.pricing.perPointBody}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{d.pricing.shownTitle}</dt>
                <dd className="mt-1 text-muted">
                  {d.pricing.shownBodyPrefix}{' '}
                  <Link href="/stations" className="font-medium text-brand hover:underline">
                    {d.stations.title}
                  </Link>{' '}
                  {d.pricing.shownBodySuffix}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{d.pricing.recordedTitle}</dt>
                <dd className="mt-1 text-muted">{d.pricing.recordedBody}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.pricing.notesTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm text-muted">
              <li>{d.pricing.note1}</li>
              <li>{d.pricing.note2}</li>
              <li>{d.pricing.note3}</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{d.pricing.currentTitle}</h2>
            <p className="mt-1 text-sm text-muted">
              {priced.length > 0
                ? format(d.pricing.pricedCount, {
                    priced: priced.length,
                    total: stations.length,
                  })
                : d.pricing.noneCount}
            </p>
          </div>
          <ButtonLink href="/stations" variant="secondary" size="md">
            {d.stations.title}
          </ButtonLink>
        </div>

        {demo && (
          <Alert tone="warning" title={d.errors.sampleData} className="mt-4">
            {warning ?? d.pricing.demoBody}
          </Alert>
        )}

        {failed && (
          <Alert tone="danger" title={d.pricing.failedTitle} className="mt-4">
            {d.pricing.failedBody}
          </Alert>
        )}

        {!failed && stations.length === 0 && (
          <Alert tone="info" className="mt-4">
            {d.pricing.emptyBody}
          </Alert>
        )}

        {stations.length > 0 && (
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <caption className="sr-only">{d.pricing.caption}</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3">
                      {d.pricing.colChargePoint}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {d.pricing.colPlugs}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {d.pricing.colMaxPower}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {d.pricing.colPrice}
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
                        {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatMoney(station.tariffPerKwh, intl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="mt-4 text-xs text-muted">{d.pricing.footnote}</p>
      </section>
    </div>
  );
}
