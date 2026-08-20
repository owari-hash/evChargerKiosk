import { z } from 'zod';
import {
  ApiError,
  badRequest,
  conflict,
  guard,
  HOUR,
  json,
  requireUser,
  route,
  tooMany,
} from '@/lib/api';
import {
  expiryFor,
  generateOtp,
  hashSecret,
  maskDestination,
  TOKEN_TTL_MINUTES,
} from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { sendSms, templates } from '@/lib/notify';
import { normalizePhone } from '@/lib/validation';

const MAX_PER_HOUR = 5;

const schema = z.object({
  phone: z.string().trim().max(20).optional(),
});

/** The client may post an empty body when re-sending to the number already on file. */
async function readBody(req: Request): Promise<unknown> {
  const raw = (await req.text()).trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest('JSON форматтай хүсэлтийн бие шаардлагатай');
  }
}

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  guard(req, 'auth:phone-send-code', 5, HOUR);

  const { phone: requested } = schema.parse(await readBody(req));

  let destination: string;
  if (requested) {
    const normalized = normalizePhone(requested);
    if (!normalized) {
      throw badRequest('Зөв утасны дугаар оруулна уу', { phone: 'Зөв утасны дугаар оруулна уу' });
    }
    destination = normalized;
  } else if (user.phone) {
    destination = user.phone;
  } else {
    throw badRequest('Эхлээд утасны дугаар нэмнэ үү', { phone: 'Утасны дугаар оруулна уу' });
  }

  const store = await getStore();
  const owner = await store.findUserByPhone(destination);
  if (owner && owner.id !== user.id) {
    throw conflict('Энэ утасны дугаар аль хэдийн бүртгэлтэй байна', {
      phone: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна',
    });
  }

  const issued = await store.countTokensSince(user.id, 'phone_verify', new Date(Date.now() - HOUR));
  if (issued >= MAX_PER_HOUR) {
    throw tooMany('Хэт олон код хүсэлээ. Нэг цагийн дараа дахин оролдоно уу.');
  }

  await store.invalidateTokens(user.id, 'phone_verify');

  const code = generateOtp();
  // The number is only parked on the token; it moves onto the account once the
  // code comes back in /api/auth/phone/verify.
  await store.createToken({
    userId: user.id,
    kind: 'phone_verify',
    secretHash: hashSecret(code),
    channel: 'sms',
    destination,
    expiresAt: expiryFor('phone_verify'),
  });

  const delivery = await sendSms({
    to: destination,
    text: templates.phoneVerifySms(code, TOKEN_TTL_MINUTES.phone_verify),
  });
  if (!delivery.delivered) {
    console.error('[phone/send-code] sms not delivered', delivery.error);
    throw new ApiError(502, 'Одоохондоо кодыг илгээж чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.');
  }

  return json({
    ok: true,
    destination: maskDestination(destination, 'sms'),
    ...(serverEnv.devExposeTokens() ? { devCode: code } : {}),
  });
});
