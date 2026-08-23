import { badRequest, forbidden, json, notFound, requireUser, route } from '@/lib/api';
import { getTransaction, remoteStop } from '@/lib/csms/stations';

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw badRequest('Цэнэглэлтийн энэ дугаар буруу байна');
  }

  const session = await getTransaction(transactionId);
  if (!session) throw notFound('Тухайн цэнэглэлтийг олсонгүй');

  // Only the account whose tag started the charge may stop it.
  if (!user.idTag || user.idTag !== session.idTag) {
    throw forbidden('Энэ цэнэглэлт өөр бүртгэлд хамаарна');
  }

  const { status } = await remoteStop(transactionId);
  return json({ status });
});
