import { ApiError, conflict, guard, HOUR, json, requireUser, route, tooMany } from '@/lib/api';
import {
  composeLinkToken,
  expiryFor,
  generateSecret,
  hashSecret,
  maskDestination,
} from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { sendEmail, templates } from '@/lib/notify';

const MAX_PER_HOUR = 10;

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  guard(req, 'auth:resend-verification', 5, HOUR);

  if (user.emailVerifiedAt) throw conflict('Таны и-мэйл хаяг аль хэдийн баталгаажсан байна');

  const store = await getStore();
  const issued = await store.countTokensSince(user.id, 'email_verify', new Date(Date.now() - HOUR));
  if (issued >= MAX_PER_HOUR) {
    throw tooMany('Хэт олон баталгаажуулах и-мэйл хүсэлээ. Нэг цагийн дараа дахин оролдоно уу.');
  }

  await store.invalidateTokens(user.id, 'email_verify');

  const secret = generateSecret();
  const token = await store.createToken({
    userId: user.id,
    kind: 'email_verify',
    secretHash: hashSecret(secret),
    channel: 'email',
    destination: user.email,
    expiresAt: expiryFor('email_verify'),
  });

  const linkToken = composeLinkToken(token.id, secret);
  const url = `${serverEnv.appUrl()}/verify-email?token=${encodeURIComponent(linkToken)}`;
  const delivery = await sendEmail({ to: user.email, ...templates.verifyEmail(url) });
  if (!delivery.delivered) {
    console.error('[resend-verification] email not delivered', delivery.error);
    throw new ApiError(502, 'Одоохондоо и-мэйлийг илгээж чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.');
  }

  return json({
    ok: true,
    destination: maskDestination(user.email, 'email'),
    ...(serverEnv.devExposeTokens() ? { devToken: linkToken } : {}),
  });
});
