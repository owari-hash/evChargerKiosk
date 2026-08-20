import { badRequest, conflict, guard, HOUR, json, parseBody, requireUser, route } from '@/lib/api';
import { secretMatches } from '@/lib/auth/tokens';
import { toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { verifyPhoneSchema } from '@/lib/validation';
import type { StoredToken } from '@/lib/db/types';

const MAX_ATTEMPTS = 5;

const invalid = () =>
  badRequest('Энэ код буруу эсвэл хугацаа нь дууссан байна. Шинэ код авна уу.', {
    code: 'Энэ код буруу байна',
  });

function usable(token: StoredToken): boolean {
  if (token.usedAt) return false;
  if (token.attempts >= MAX_ATTEMPTS) return false;
  return new Date(token.expiresAt).getTime() > Date.now();
}

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  guard(req, 'auth:phone-verify', 20, HOUR);
  const { code } = await parseBody(req, verifyPhoneSchema);

  const store = await getStore();
  const candidates = (await store.findActiveTokens(user.id, 'phone_verify')).filter(usable);

  let matched: StoredToken | null = null;
  for (const candidate of candidates) {
    if (secretMatches(code, candidate.secretHash)) {
      matched = candidate;
      break;
    }
    const attempts = await store.incrementTokenAttempts(candidate.id);
    if (attempts >= MAX_ATTEMPTS) await store.markTokenUsed(candidate.id);
  }
  if (!matched) throw invalid();

  const owner = await store.findUserByPhone(matched.destination);
  if (owner && owner.id !== user.id) {
    await store.markTokenUsed(matched.id);
    throw conflict('Энэ утасны дугаар аль хэдийн бүртгэлтэй байна', {
      phone: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна',
    });
  }

  const updated =
    (await store.updateUser(user.id, {
      phone: matched.destination,
      phoneVerifiedAt: new Date().toISOString(),
    })) ?? user;
  await store.markTokenUsed(matched.id);
  await store.invalidateTokens(user.id, 'phone_verify');

  return json({ ok: true, user: toPublicUser(updated) });
});
