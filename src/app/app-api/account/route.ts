import { json, notFound, requireUser, route } from '@/lib/api';
import { getStore } from '@/lib/db';

export const DELETE = route(async () => {
  const user = await requireUser();
  const store = await getStore();

  // Deactivate account and clear sensitive identifiers
  const updated = await store.updateUser(user.id, {
    isActive: false,
    idTag: undefined,
    name: 'Deleted User',
  });

  if (!updated) throw notFound('Таны бүртгэлийг олсонгүй');

  return json({ ok: true, message: 'Бүртгэл амжилттай устгагдлаа' });
});
