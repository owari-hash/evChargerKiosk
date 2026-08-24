import { badRequest, conflict, guard, HOUR, json, parseBody, route } from '@/lib/api';
import { ensureChargeTag } from '@/lib/csms/charge-tag';
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
      throw badRequest('Тэмдэглэсэн талбаруудаа шалгана уу', {
        phone: 'Зөв утасны дугаар оруулна уу',
      });
    }
    phone = normalized;
  }

  if (await store.findUserByEmail(body.email)) {
    throw conflict('Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна', {
      email: 'Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна',
    });
  }
  if (phone && (await store.findUserByPhone(phone))) {
    throw conflict('Энэ утасны дугаар аль хэдийн бүртгэлтэй байна', {
      phone: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна',
    });
  }

  const user = await store.createUser({
    email: body.email,
    phone,
    name: body.name,
    passwordHash: await hashPassword(body.password),
  });

  // Every account gets its charge tag immediately, so a driver can charge
  // without ever being asked to know what a tag is. A CSMS that is down here
  // does not block sign-up; the tag is issued on the next visit instead.
  await ensureChargeTag(user);

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
