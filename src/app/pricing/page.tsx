import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { listStations } from '@/lib/driver-api';
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
  failed: boolean;
}

async function loadTariffs(): Promise<TariffData> {
  try {
    const { stations } = await listStations({ limit: 200 });
    return { stations, failed: false };
  } catch (err) {
    console.error('[pricing] could not load tariffs', err);
    return { stations: [], failed: true };
  }
}

export default async function PricingPage() {
  const [{ stations, failed }, { locale, d }] = await Promise.all([
    loadTariffs(),
    getTranslations(),
  ]);
  const intl = intlLocale(locale);
  const priced = stations.filter((s) => typeof s.tariffPerKwh === 'number');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {d.pricing.title}
        </h1>
        <p className="mt-3 text-base text-muted">{d.pricing.intro}</p>
      </header>

      {/* ---- Tariff table first ---- */}
      <section className="mt-8">
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
          <>
            {/* Mobile list view */}
            <div className="mt-4 space-y-3 sm:hidden">
              {stations.map((station) => (
                <Card key={station.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/stations/${encodeURIComponent(station.id)}`}
                        className="font-semibold text-foreground hover:text-brand break-words"
                      >
                        {station.name}
                      </Link>
                      {station.connectorTypes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {station.connectorTypes.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-brand/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold text-foreground block">
                        {formatMoney(station.tariffPerKwh, intl, 2)}
                      </span>
                      {station.maxPowerKw ? (
                        <span className="text-xs text-muted font-medium mt-0.5 block">
                          ⚡ {formatPowerKw(station.maxPowerKw, intl)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Tablet/Desktop table view */}
            <Card className="mt-4 hidden overflow-hidden sm:block">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{d.pricing.caption}</caption>
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th scope="col" className="px-4 py-3">
                        {d.pricing.colChargePoint}
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
                      <tr key={station.id} className="border-b border-border last:border-0 hover:bg-surface-muted/30 transition">
                        <th scope="row" className="px-4 py-3 text-left font-medium">
                          <Link
                            href={`/stations/${encodeURIComponent(station.id)}`}
                            className="font-semibold text-foreground hover:text-brand hover:underline"
                          >
                            {station.name}
                          </Link>
                          {station.connectorTypes.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {station.connectorTypes.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-brand/20"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </th>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">
                          {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatMoney(station.tariffPerKwh, intl, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <p className="mt-4 text-xs text-muted">{d.pricing.footnote}</p>
      </section>

      {/* ---- How it works below ---- */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
    </div>
  );
}
