import { z } from 'zod';
import { conflict, json, notFound, parseBody, parseQuery, requireUser, route } from '@/lib/api';
import { toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { bindIdTagToWallet, unbindIdTagFromWallet } from '@/lib/csms/wallet';

/**
 * Charge tags (RFID cards or app tokens) linked to a driver account.
 *
 * Linking only records the tag against the account so the driver can see their own
 * sessions and start a charge with it. Proving that someone physically holds a given
 * card is an operator step in the CSMS — this endpoint cannot verify ownership.
 */

const idTagSchema = z
  .string()
  .trim()
  .min(1, 'Enter the tag printed on your card')
  .max(20, 'A charge tag is at most 20 characters')
  .regex(/^[A-Za-z0-9._:-]+$/, 'Use letters, numbers and . _ : - only');

const bodySchema = z.object({ idTag: idTagSchema });
const querySchema = z.object({ idTag: idTagSchema });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { idTag } = await parseBody(req, bodySchema);

  const idTags = user.idTags ?? [];
  if (idTags.includes(idTag)) {
    throw conflict('That charge tag is already linked', {
      idTag: 'This tag is already linked to your account',
    });
  }

  const store = await getStore();
  const updated = await store.updateUser(user.id, { idTags: [...idTags, idTag] });
  if (!updated) throw notFound('We could not find your account');

  // Point the tag at this account's wallet so charging with it draws on the
  // account balance. Best-effort: a tag the operator has not created in the CSMS
  // yet cannot be bound, and that must not stop the driver linking it here.
  await bindIdTagToWallet(user.id, idTag);

  return json({ user: toPublicUser(updated) });
});

export const DELETE = route(async (req: Request) => {
  const user = await requireUser();
  const { idTag } = parseQuery(req, querySchema);

  const idTags = user.idTags ?? [];
  if (!idTags.includes(idTag)) {
    throw notFound('That charge tag is not linked to your account');
  }

  const store = await getStore();
  const updated = await store.updateUser(user.id, {
    idTags: idTags.filter((tag) => tag !== idTag),
  });
  if (!updated) throw notFound('We could not find your account');

  // The tag falls back to its own wallet; the account balance stays put.
  await unbindIdTagFromWallet(user.id, idTag);

  return json({ user: toPublicUser(updated) });
});
