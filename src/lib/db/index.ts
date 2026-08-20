import { serverEnv, isProduction } from '@/lib/env';
import { connectMongo } from './mongoose';
import { mongoStore } from './mongo-store';
import { fileStore } from './file-store';
import type { UserStore } from './types';

export type { StoredUser, StoredToken, TokenKind, UserStore } from './types';

let resolved: UserStore | null = null;
let probe: Promise<UserStore> | null = null;

/**
 * Picks the account store once per process: MongoDB when `MONGODB_URI` is set and
 * reachable, otherwise the JSON dev store (never in production).
 */
export async function getStore(): Promise<UserStore> {
  if (resolved) return resolved;

  probe ??= (async () => {
    const uri = serverEnv.mongoUri();
    if (uri) {
      try {
        await connectMongo();
        resolved = mongoStore;
        return mongoStore;
      } catch (err) {
        if (isProduction || !serverEnv.allowFileStore()) throw err;
        console.warn(
          `[accounts] MongoDB unreachable (${(err as Error).message}). ` +
            'Falling back to the .data/driver-accounts.json dev store.',
        );
      }
    } else if (isProduction) {
      throw new Error('MONGODB_URI must be configured in production');
    }

    if (!serverEnv.allowFileStore()) {
      throw new Error('No account store available: set MONGODB_URI or ALLOW_FILE_STORE=true');
    }
    resolved = fileStore;
    return fileStore;
  })();

  try {
    return await probe;
  } finally {
    // Allow a later request to retry if the probe threw.
    if (!resolved) probe = null;
  }
}
