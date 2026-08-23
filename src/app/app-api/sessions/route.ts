import { z } from 'zod';
import { json, parseQuery, requireUser, route } from '@/lib/api';
import { decorateSessions, listSessionsForIdTags } from '@/lib/csms/stations';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const { limit } = parseQuery(req, querySchema);

  // An account whose tag has not been issued yet simply has no history.
  const sessions = await decorateSessions(await listSessionsForIdTags(user.idTag, limit));
  return json({ sessions });
});
