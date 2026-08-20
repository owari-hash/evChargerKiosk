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
    throw forbidden('Энэ сүлжээнд алсаас эхлүүлэх боломж идэвхгүй байна. Цэнэглэлтийг станц дээр нь эхлүүлнэ үү.');
  }

  guard(req, `station-start:${user.id}`, 10, HOUR);

  const { id } = await ctx.params;

  // The body is optional: without a connector the station picks a free plug itself.
  const raw: unknown = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new ApiError(400, 'Тэмдэглэсэн талбаруудаа шалгана уу', fieldErrors(parsed.error));
  }

  const idTag = (user.idTags ?? [])[0];
  if (!idTag) {
    throw badRequest('Алсаас цэнэглэлт эхлүүлэхийн өмнө бүртгэлдээ цэнэглэх карт холбоно уу', {
      idTag: 'Бүртгэлийн тохиргоондоо цэнэглэх карт нэмнэ үү',
    });
  }

  const { status } = await remoteStart(id, idTag, parsed.data.connectorId);
  return json({ status });
});
