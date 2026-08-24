/**
 * Issues a charge tag to every driver account that predates automatic issuing.
 *
 *   npx tsx scripts/backfill-charge-tags.ts --dry-run
 *   npx tsx scripts/backfill-charge-tags.ts
 *
 * Accounts used to hold a list of tags typed in by hand (`idTags`); accounts now
 * hold exactly one, issued at sign-up (`idTag`). This carries the old data over:
 *
 *   - an account with a hand-linked tag keeps the first one, so its charging
 *     history stays attached
 *   - an account with none is issued a fresh tag
 *
 * Either way the tag is (re-)created in the CSMS with the account's email as the
 * owner, which is the ownership check the old typed-in flow never had.
 *
 * Safe to re-run: accounts that already have a usable tag are left alone.
 */
import { generateChargeTag } from '../src/lib/charge-tag';
import { csmsFetch } from '../src/lib/csms/client';
import { bindIdTagToWallet } from '../src/lib/csms/wallet';
import { connectMongo } from '../src/lib/db/mongoose';
import { DriverUser } from '../src/lib/db/models';

const dryRun = process.argv.slice(2).includes('--dry-run');
const tag = dryRun ? '[dry run] ' : '';

interface LegacyUser {
  _id: unknown;
  email: string;
  name?: string;
  idTag?: string;
  idTags?: string[];
}

async function register(idTag: string, user: LegacyUser): Promise<void> {
  await csmsFetch('/id-tags', {
    method: 'POST',
    body: {
      idTag,
      status: 'Accepted',
      label: user.name || user.email,
      ownerEmail: user.email,
      ownerName: user.name,
      maxActiveTransactions: 1,
      allowedChargePointIds: [],
    },
  }).catch((err: unknown) => {
    // Already in the CSMS is the expected case for a carried-over tag.
    if ((err as { status?: number }).status !== 409) throw err;
  });
  await bindIdTagToWallet(String(user._id), idTag);
}

async function main(): Promise<number> {
  await connectMongo();

  const users = (await DriverUser.find().lean()) as unknown as LegacyUser[];
  let carried = 0;
  let issued = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.idTag) {
      skipped++;
      continue;
    }

    // Keep the tag the driver was already charging with, so their history and
    // any running session stay theirs.
    const existing = user.idTags?.[0];
    const idTag = existing ?? generateChargeTag();

    if (dryRun) {
      console.log(`${tag}${user.email} -> ${idTag}${existing ? ' (carried over)' : ' (new)'}`);
    } else {
      await register(idTag, user);
      await DriverUser.updateOne(
        { _id: user._id },
        { $set: { idTag }, $unset: { idTags: '' } },
      );
      console.log(`${user.email} -> ${idTag}${existing ? ' (carried over)' : ' (new)'}`);
    }

    if (existing) carried++;
    else issued++;
  }

  console.log(
    `${tag}${users.length} accounts — ${carried} carried over, ${issued} newly issued, ${skipped} already had one`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error('backfill failed', err);
    process.exit(1);
  });
