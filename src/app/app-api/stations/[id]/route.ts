import { json, notFound, route } from '@/lib/api';
import { getStation } from '@/lib/csms/stations';

export const dynamic = 'force-dynamic';

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { station, demo } = await getStation(id);
  if (!station) throw notFound('We could not find that charging station');
  return json({ station, demo });
});
