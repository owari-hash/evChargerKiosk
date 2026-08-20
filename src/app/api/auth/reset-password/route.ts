import { badRequest, guard, HOUR, json, parseBody, route } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { parseLinkToken, secretMatches } from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { normalizePhone, resetPasswordSchema } from '@/lib/validation';
import type { StoredToken, UserStore } from '@/lib/db/types';

const MAX_ATTEMPTS = 5;

const invalidLink = () =>
  badRequest('That reset link is invalid or has expired. Please request a new one.', {
    token: 'This reset link is no longer valid',
  });

const invalidCode = () =>
  badRequest('That code is invalid or has expired. Please request a new one.', {
    code: 'This code is not valid',
  });

function usable(token: StoredToken): boolean {
  if (token.usedAt) return false;
  if (token.attempts >= MAX_ATTEMPTS) return false;
  return new Date(token.expiresAt).getTime() > Date.now();
}

/** Burns one attempt and retires the token once the guess budget is gone. */
async function registerFailure(store: UserStore, token: StoredToken): Promise<void> {
  const attempts = await store.incrementTokenAttempts(token.id);
  if (attempts >= MAX_ATTEMPTS) await store.markTokenUsed(token.id);
}

export const POST = route(async (req: Request) => {
  guard(req, 'auth:reset-password', 10, HOUR);
  const body = await parseBody(req, resetPasswordSchema);
  const store = await getStore();

  let matched: StoredToken;

  if (body.token) {
    const parsed = parseLinkToken(body.token);
    if (!parsed) throw invalidLink();

    const token = await store.findTokenById(parsed.id);
    if (!token || token.kind !== 'password_reset' || !usable(token)) throw invalidLink();

    if (!secretMatches(parsed.secret, token.secretHash)) {
      await registerFailure(store, token);
      throw invalidLink();
    }
    matched = token;
  } else {
    const phone = normalizePhone(body.phone ?? '');
    if (!phone) {
      throw badRequest('Enter a valid phone number', { phone: 'Enter a valid phone number' });
    }

    const owner = await store.findUserByPhone(phone);
    if (!owner) throw invalidCode();

    const candidates = (await store.findActiveTokens(owner.id, 'password_reset')).filter(
      (t) => t.channel === 'sms' && usable(t),
    );

    let found: StoredToken | null = null;
    for (const candidate of candidates) {
      if (secretMatches(body.code ?? '', candidate.secretHash)) {
        found = candidate;
        break;
      }
      await registerFailure(store, candidate);
    }
    if (!found) throw invalidCode();
    matched = found;
  }

  const user = await store.findUserById(matched.userId);
  if (!user || !user.isActive) throw body.token ? invalidLink() : invalidCode();

  await store.updateUser(user.id, {
    passwordHash: await hashPassword(body.password),
    // Bumping the version invalidates every session cookie issued before the reset.
    tokenVersion: (user.tokenVersion ?? 0) + 1,
  });
  await store.markTokenUsed(matched.id);
  await store.invalidateTokens(user.id, 'password_reset');

  return json({ ok: true });
});
