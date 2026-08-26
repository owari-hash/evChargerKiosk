import { z } from 'zod';
import { badRequest, guard, HOUR, json, parseBody, route } from '@/lib/api';
import { parseLinkToken, secretMatches } from '@/lib/auth/tokens';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';

const MAX_ATTEMPTS = 5;

const schema = z.object({
  token: z.string().trim().min(1, 'Энэ баталгаажуулах холбоос дутуу байна'),
});

const invalid = () =>
  badRequest('Энэ баталгаажуулах холбоос буруу эсвэл хугацаа нь дууссан байна. Шинэ холбоос авна уу.', {
    token: 'Энэ баталгаажуулах холбоос хүчингүй болсон байна',
  });

export const POST = route(async (req: Request) => {
  guard(req, 'auth:verify-email', 20, HOUR);
  const { token: raw } = await parseBody(req, schema);
  const store = await getStore();

  const parsed = parseLinkToken(raw);
  if (!parsed) throw invalid();

  const token = await store.findTokenById(parsed.id);
  if (!token || token.kind !== 'email_verify' || token.usedAt) throw invalid();
  if (token.attempts >= MAX_ATTEMPTS) throw invalid();
  if (new Date(token.expiresAt).getTime() <= Date.now()) throw invalid();

  if (!secretMatches(parsed.secret, token.secretHash)) {
    const attempts = await store.incrementTokenAttempts(token.id);
    if (attempts >= MAX_ATTEMPTS) await store.markTokenUsed(token.id);
    throw invalid();
  }

  const user = await store.findUserById(token.userId);
  if (!user || !user.isActive) throw invalid();

  const updated =
    (await store.updateUser(user.id, {
      emailVerifiedAt: user.emailVerifiedAt ?? new Date().toISOString(),
    })) ?? user;
  await store.markTokenUsed(token.id);
  await setSessionCookie(updated);

  return json({ ok: true, user: toPublicUser(updated) });
});
