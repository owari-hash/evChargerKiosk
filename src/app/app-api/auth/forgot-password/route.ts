import { guard, HOUR, json, parseBody, route } from '@/lib/api';
import {
  composeLinkToken,
  expiryFor,
  generateOtp,
  generateSecret,
  hashSecret,
  maskDestination,
  TOKEN_TTL_MINUTES,
} from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { sendEmail, sendSms, templates } from '@/lib/notify';
import { forgotPasswordSchema, normalizePhone } from '@/lib/validation';
import type { StoredUser } from '@/lib/db/types';

/** The same answer is returned whether or not an account matched. */
const MESSAGE = 'If that account exists, we have sent password reset instructions.';
const MAX_PER_HOUR = 5;

const quiet = () => json({ ok: true, channel: null, message: MESSAGE });

function pickChannel(
  user: StoredUser,
  requested: 'auto' | 'email' | 'sms',
  identifierIsEmail: boolean,
): 'email' | 'sms' | null {
  const canEmail = Boolean(user.email);
  const canSms = Boolean(user.phone);
  // An explicit choice is honoured only when the account really has that destination.
  if (requested === 'email') return canEmail ? 'email' : null;
  if (requested === 'sms') return canSms ? 'sms' : null;
  if (identifierIsEmail) return canEmail ? 'email' : canSms ? 'sms' : null;
  return canSms ? 'sms' : canEmail ? 'email' : null;
}

export const POST = route(async (req: Request) => {
  guard(req, 'auth:forgot-password', 5, HOUR);
  const { identifier, channel } = await parseBody(req, forgotPasswordSchema);

  const identifierIsEmail = identifier.includes('@');
  const phone = identifierIsEmail ? null : normalizePhone(identifier);

  const store = await getStore();
  const user = identifierIsEmail
    ? await store.findUserByEmail(identifier.toLowerCase())
    : phone
      ? await store.findUserByPhone(phone)
      : null;

  if (!user || !user.isActive) return quiet();

  const chosen = pickChannel(user, channel, identifierIsEmail);
  if (!chosen) return quiet();

  const issued = await store.countTokensSince(
    user.id,
    'password_reset',
    new Date(Date.now() - HOUR),
  );
  if (issued >= MAX_PER_HOUR) return quiet();

  await store.invalidateTokens(user.id, 'password_reset');
  const minutes = TOKEN_TTL_MINUTES.password_reset;
  const expose = serverEnv.devExposeTokens();

  if (chosen === 'email') {
    const secret = generateSecret();
    const token = await store.createToken({
      userId: user.id,
      kind: 'password_reset',
      secretHash: hashSecret(secret),
      channel: 'email',
      destination: user.email,
      expiresAt: expiryFor('password_reset'),
    });

    const linkToken = composeLinkToken(token.id, secret);
    const url = `${serverEnv.appUrl()}/reset-password?token=${encodeURIComponent(linkToken)}`;
    const delivery = await sendEmail({
      to: user.email,
      ...templates.passwordResetEmail(url, minutes),
    });
    if (!delivery.delivered) console.error('[forgot-password] email failed', delivery.error);

    return json({
      ok: true,
      channel: 'email' as const,
      destination: maskDestination(user.email, 'email'),
      message: MESSAGE,
      ...(expose ? { devToken: linkToken } : {}),
    });
  }

  const destination = user.phone as string;
  const code = generateOtp();
  await store.createToken({
    userId: user.id,
    kind: 'password_reset',
    secretHash: hashSecret(code),
    channel: 'sms',
    destination,
    expiresAt: expiryFor('password_reset'),
  });

  const delivery = await sendSms({
    to: destination,
    text: templates.passwordResetSms(code, minutes),
  });
  if (!delivery.delivered) console.error('[forgot-password] sms failed', delivery.error);

  return json({
    ok: true,
    channel: 'sms' as const,
    destination: maskDestination(destination, 'sms'),
    message: MESSAGE,
    ...(expose ? { devCode: code } : {}),
  });
});
