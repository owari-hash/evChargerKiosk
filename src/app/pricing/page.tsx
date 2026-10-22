import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { listStations } from '@/lib/driver-api';
import { format, getTranslations } from '@/lib/i18n';
import type { Station } from '@/lib/types';
import { formatMoney, formatPowerKw, intlLocale } from '@/lib/utils';

/** Returns the base tariff per kWh without the service fee markup. */
function stationBaseTariff(station: Station): number | undefined {
  if (station.baseTariffPerKwh !== undefined) return station.baseTariffPerKwh;
  if (station.tariffPerKwh === undefined) return undefined;
  if (station.feePercent)
    return Math.round(station.tariffPerKwh / (1 + station.feePercent / 100));
  return station.tariffPerKwh;
}

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
      {/* ---- Tariff list first ---- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{d.pricing.currentTitle}</h2>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((station) => (
              <Link
                key={station.id}
                href={`/stations/${encodeURIComponent(station.id)}`}
                className="group block"
              >
                <Card className="h-full p-4 transition hover:border-brand/40 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-semibold text-foreground break-words group-hover:text-brand">
                      {station.name}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 ring-1 ring-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {station.availableConnectors} / {station.totalConnectors}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {station.connectorTypes.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-brand/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-[11px] font-medium text-muted">{d.pricing.colMaxPower}</p>
                      <p className="mt-0.5 text-sm font-semibold text-brand">
                        {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-muted">{d.pricing.colPrice}</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                        {stationBaseTariff(station) !== undefined
                          ? `${stationBaseTariff(station)}₮`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
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
