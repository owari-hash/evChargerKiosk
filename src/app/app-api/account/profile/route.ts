import { badRequest, conflict, json, notFound, parseBody, requireUser, route } from '@/lib/api';
import { toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import type { StoredUser } from '@/lib/db/types';
import { normalizePhone, updateProfileSchema } from '@/lib/validation';

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const body = await parseBody(req, updateProfileSchema);

  const patch: Partial<StoredUser> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.locale !== undefined) patch.locale = body.locale;

  if (body.phone !== undefined) {
    if (body.phone === '') {
      patch.phone = undefined;
      patch.phoneVerifiedAt = undefined;
    } else {
      const phone = normalizePhone(body.phone);
      if (!phone) {
        throw badRequest('Тэмдэглэсэн талбаруудаа шалгана уу', {
          phone: 'Зөв утасны дугаар оруулна уу',
        });
      }
      if (phone !== user.phone) {
        const store = await getStore();
        const existing = await store.findUserByPhone(phone);
        if (existing && existing.id !== user.id) {
          throw conflict('Энэ утасны дугаар аль хэдийн ашиглагдаж байна', {
            phone: 'Энэ утасны дугаар өөр бүртгэлд холбогдсон байна',
          });
        }
        patch.phone = phone;
        // A new number has not been proven yet, so it goes back to unverified.
        patch.phoneVerifiedAt = undefined;
      }
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
