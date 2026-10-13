import { notFound, redirect } from 'next/navigation';
import { Alert, ButtonLink } from '@/components/ui';
import { resolveConnectorCode } from '@/lib/driver-api';
import { getTranslations } from '@/lib/i18n';

/**
 * The destination of a connector's printed QR sticker: `eplug.mn/c/K7M4Q2`.
 *
 * It resolves the code and sends the driver to that station with the gun they
 * are standing at already chosen, so the only thing left to do is sign in and
 * start. The code is short and opaque on purpose — it does not encode `cpId`,
 * which an operator may rename, so a sticker outlives any console edit.
 */
export const dynamic = 'force-dynamic';

export default async function ConnectorCodePage(props: PageProps<'/c/[code]'>) {
  const { code } = await props.params;

  let resolved: Awaited<ReturnType<typeof resolveConnectorCode>>;
  try {
    resolved = await resolveConnectorCode(code);
  } catch (err) {
    // The API is down. Say so rather than claiming the sticker is wrong — the
    // driver is standing in front of a real charger with a real code.
    console.error(`[connector-code] could not resolve ${code}`, err);
    return <UnreachableNotice />;
  }

  // A code that is genuinely not ours: a 404 is the honest answer.
  if (!resolved) notFound();

  redirect(`/stations/${resolved.stationId}?connector=${resolved.connectorId}&via=qr`);
}

async function UnreachableNotice() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Alert tone="warning" title={d.errors.errorTitle}>
        {d.errors.networkUnreachable}
      </Alert>
      <div className="mt-5 flex justify-center">
        <ButtonLink href="/stations" variant="secondary">
          {d.nav.stations}
        </ButtonLink>
      </div>
    </div>
  );
}
