import { badRequest, forbidden, json, notFound, requireUser, route } from '@/lib/api';
import { getTransaction, remoteStop } from '@/lib/csms/stations';

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw badRequest('That charging session reference is not valid');
  }

  const session = await getTransaction(transactionId);
  if (!session) throw notFound('We could not find that charging session');

  // Only the account holding the tag that started the charge may stop it.
  if (!(user.idTags ?? []).includes(session.idTag)) {
    throw forbidden('That charging session belongs to another account');
  }

  const { status } = await remoteStop(transactionId);
  return json({ status });
});
