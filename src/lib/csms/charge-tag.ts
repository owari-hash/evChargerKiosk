import { generateChargeTag } from '@/lib/charge-tag';
import { getStore } from '@/lib/db';
import type { StoredUser } from '@/lib/db/types';
import { csmsFetch } from './client';
import { bindIdTagToWallet } from './wallet';

/**
 * Issuing a driver's charge tag.
 *
 * The tag has to exist in two places to be usable: on the account here, and as
 * an `IdTag` in the CSMS, which is what `Authorize` looks up. Creating it in the
 * CSMS also records the account's email as the owner, so a tag can always be
 * traced back to exactly one driver.
 */

/** Retries cover the vanishingly unlikely case of a generated tag colliding. */
const ATTEMPTS = 5;

interface CreatedTag {
  idTag: string;
}

/**
 * Ensures the account has a usable charge tag, creating one if needed.
 *
 * Safe to call more than once: an account that already has a tag keeps it, and
 * the CSMS record is re-asserted so a tag that exists locally but never reached
 * the CSMS — because it was down at sign-up — is repaired on the next call.
 */
export async function ensureChargeTag(user: StoredUser): Promise<string | undefined> {
  if (user.idTag) {
    await registerWithCsms(user.idTag, user).catch(() => undefined);
    return user.idTag;
  }

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const idTag = generateChargeTag();
    try {
      await registerWithCsms(idTag, user);
    } catch (err) {
      // 409 means the tag is taken; anything else means the CSMS is unwell and
      // the account is left without a tag rather than with an unusable one.
      if ((err as { status?: number }).status === 409) continue;
      console.warn('[charge-tag] could not create tag in the CSMS', (err as Error).message);
      return undefined;
    }

    const store = await getStore();
    await store.updateUser(user.id, { idTag });
    return idTag;
  }

  console.warn('[charge-tag] gave up generating a unique tag');
  return undefined;
}

/** Creates the IdTag in the CSMS and points it at this account's wallet. */
async function registerWithCsms(idTag: string, user: StoredUser): Promise<void> {
  await csmsFetch<CreatedTag>('/id-tags', {
    method: 'POST',
    body: {
      idTag,
      status: 'Accepted',
      label: user.name || user.email,
      ownerEmail: user.email,
      ownerName: user.name,
      // One car at a time per driver. A second simultaneous charge on the same
      // tag is refused by the CSMS with ConcurrentTx.
      maxActiveTransactions: 1,
      // Empty allow-list: valid at every station on the network.
      allowedChargePointIds: [],
    },
  });

  // Charging then draws on the account balance rather than the tag's own.
  await bindIdTagToWallet(user.id, idTag);
}
