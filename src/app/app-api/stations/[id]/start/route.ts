import { z } from 'zod';
import { ApiError, HOUR, badRequest, forbidden, guard, json, requireUser, route } from '@/lib/api';
import { remoteStart } from '@/lib/csms/stations';
import { serverEnv } from '@/lib/env';
import { fieldErrors } from '@/lib/validation';

const bodySchema = z.object({
  connectorId: z.coerce.number().int().min(1).max(64).optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();

  if (!serverEnv.enableRemoteStart()) {
    throw forbidden('Remote start is switched off on this network. Please start the charge at the station.');
  }

  guard(req, `station-start:${user.id}`, 10, HOUR);

  const { id } = await ctx.params;

  // The body is optional: without a connector the station picks a free plug itself.
  const raw: unknown = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new ApiError(400, 'Please check the highlighted fields', fieldErrors(parsed.error));
  }

  const idTag = (user.idTags ?? [])[0];
  if (!idTag) {
    throw badRequest('Link a charge tag to your account before starting a charge remotely', {
      idTag: 'Add a charge tag in your account settings',
    });
  }

  const { status } = await remoteStart(id, idTag, parsed.data.connectorId);
  return json({ status });
});
