import { z } from 'zod';
import { badRequest, json, requireUser, route } from '@/lib/api';
import { requestEBarimt } from '@/lib/csms/stations';

const ebarimtSchema = z.object({
  type: z.enum(['B2C_RECEIPT', 'B2B_RECEIPT']).default('B2C_RECEIPT'),
  customerTin: z.string().optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();

  const { id } = await ctx.params;
  const transactionId = Number(id);
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    throw badRequest('Гүйлгээний дугаар буруу байна');
  }

  const raw: unknown = await req.json().catch(() => ({}));
  const parsed = ebarimtSchema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest('Тэмдэглэсэн талбаруудаа шалгана уу');
  }

  const { type, customerTin } = parsed.data;
  if (type === 'B2B_RECEIPT' && (!customerTin || customerTin.trim().length < 5)) {
    throw badRequest('Байгууллагын регистрийн дугаарыг зөв оруулна уу');
  }

  const session = await requestEBarimt(transactionId, {
    type,
    customerTin: customerTin?.trim(),
  });

  return json({ session });
});
