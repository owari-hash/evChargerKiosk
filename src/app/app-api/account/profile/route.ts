import { badRequest, conflict, json, notFound, parseBody, requireUser, route } from '@/lib/api';
import { toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import type { StoredUser } from '@/lib/db/types';
import { normalizePhone, updateProfileSchema } from '@/lib/validation';

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const body = await parseBody(req, updateProfileSchema);

  const patch: Partial<StoredUser> = {};
  if (body.name !== undefined) patch.name = body.name || undefined;
  if (body.locale !== undefined) patch.locale = body.locale;

  if (body.email !== undefined && (body.email || undefined) !== user.email) {
    if (body.email) {
      const store = await getStore();
      const existing = await store.findUserByEmail(body.email);
      if (existing && existing.id !== user.id) {
        throw conflict('Энэ и-мэйл хаяг аль хэдийн ашиглагдаж байна', {
          email: 'Энэ и-мэйл хаяг өөр бүртгэлд холбогдсон байна',
        });
      }
    }
    // Email is optional, so clearing the field removes it from the account.
    patch.email = body.email || undefined;
    patch.emailVerifiedAt = undefined;
  }

  // The phone number is how the driver signs in, so it only ever changes
  // through the SMS code flow on the security page — never by typing it here.
  if (body.phone !== undefined) {
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (phone !== (user.phone ?? null)) {
      throw badRequest('Утасны дугаараа «Аюулгүй байдал» хэсэгт SMS кодоор баталгаажуулж солино уу', {
        phone: 'Утасны дугаарыг SMS кодоор баталгаажуулж солино',
      });
    }
  }

  if (Object.keys(patch).length === 0) {
    return json({ user: toPublicUser(user) });
  }

  const store = await getStore();
  const updated = await store.updateUser(user.id, patch);
  if (!updated) throw notFound('Таны бүртгэлийг олсонгүй');

  return json({ user: toPublicUser(updated) });
});
