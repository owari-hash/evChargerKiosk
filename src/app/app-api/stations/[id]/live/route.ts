import { json, notFound, route } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth/session';
import { getStation, listSessionsForIdTags } from '@/lib/csms/stations';
import type { ChargingSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Everything the charging panel needs to say where a driver is in the process,
 * in one request: the live connector states, and this driver's own session on
 * this station if one is running.
 *
 * It is polled every few seconds while a charge is in progress, so it stays a
 * single round trip rather than the panel stitching together the station and
 * the session list itself.
 */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const { station } = await getStation(id);
  if (!station) throw notFound('Тухайн цэнэглэх станцыг олсонгүй');

  // Signed out, the connector states are still worth showing — they are what
  // tells a driver whether it is worth stopping here at all.
  const user = await getCurrentUser();
  const idTags = user?.idTags ?? [];

  let session: ChargingSession | null = null;
  if (idTags.length > 0) {
    const mine = await listSessionsForIdTags(idTags, 20);
    // The station is matched on both identifiers: the CSMS reports the
    // transaction against its own id, while the page may have been opened by
    // the OCPP name.
    session =
      mine.find(
        (s) =>
          s.status === 'Active' &&
          (s.chargePointId === station.id || s.chargePointId === station.cpId),
      ) ??
      // A charge that has just ended is still the thing the driver is looking
      // at, so the most recent one is returned until they leave the page.
      mine.find(
        (s) => s.chargePointId === station.id || s.chargePointId === station.cpId,
      ) ??
      null;
  }

  return json({
    availability: station.availability,
    connectors: station.connectors,
    availableConnectors: station.availableConnectors,
    totalConnectors: station.totalConnectors,
    tariffPerKwh: station.tariffPerKwh,
    session,
  });
});
