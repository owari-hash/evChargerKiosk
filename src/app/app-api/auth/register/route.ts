import { badRequest, conflict, guard, HOUR, json, parseBody, route } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
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
import { normalizePhone, registerSchema } from '@/lib/validation';

export const POST = route(async (req: Request) => {
  guard(req, 'auth:register', 5, HOUR);
  const body = await parseBody(req, registerSchema);
  const store = await getStore();

  let phone: string | undefined;
  if (body.phone) {
    const normalized = normalizePhone(body.phone);
    if (!normalized) {
      throw badRequest('Please check the highlighted fields', {
        phone: 'Enter a valid phone number',
      });
    }
    phone = normalized;
  }

  if (await store.findUserByEmail(body.email)) {
    throw conflict('That email address is already registered', {
      email: 'That email address is already registered',
    });
  }
  if (phone && (await store.findUserByPhone(phone))) {
    throw conflict('That phone number is already registered', {
      phone: 'That phone number is already registered',
    });
  }

  const user = await store.createUser({
    email: body.email,
    phone,
    name: body.name,
    passwordHash: await hashPassword(body.password),
  });

  await setSessionCookie(user);

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
  // A mail outage must not cost the driver their new account: the address can be
  // confirmed later from the account page.
  const delivery = await sendEmail({ to: user.email, ...templates.verifyEmail(url) });
  if (!delivery.delivered) {
    console.error('[register] verification email not delivered', delivery.error);
  }

  return json({
    user: toPublicUser(user),
    verification: {
      sent: delivery.delivered,
      destination: maskDestination(user.email, 'email'),
      ...(serverEnv.devExposeTokens() ? { devToken: linkToken } : {}),
    },
  });
});
