import { json, parseQuery, route } from '@/lib/api';
import { listStations } from '@/lib/csms/stations';
import { stationQuerySchema } from '@/lib/validation';

// Connector status changes by the second, so this listing is never cached.
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const query = parseQuery(req, stationQuerySchema);
  const result = await listStations(query);
  return json(result);
});
