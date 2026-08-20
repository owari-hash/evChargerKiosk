import { json, requireUser, route } from '@/lib/api';
import { toPublicUser } from '@/lib/auth/session';

export const GET = route(async () => {
  const user = await requireUser();
  return json({ user: toPublicUser(user) });
});
