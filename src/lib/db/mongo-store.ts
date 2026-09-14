import { connectMongo } from './mongoose';
import { DriverUser, VerificationToken, type DriverUserDoc, type VerificationTokenDoc } from './models';
import type { NewToken, NewUser, StoredToken, StoredUser, TokenKind, UserStore } from './types';

function toUser(doc: DriverUserDoc): StoredUser {
  return {
    id: String(doc._id),
    email: doc.email || undefined,
    phone: doc.phone || undefined,
    name: doc.name || undefined,
    passwordHash: doc.passwordHash || undefined,
    pinHash: doc.pinHash || undefined,
    failedPinAttempts: doc.failedPinAttempts ?? 0,
    pinLockedUntil: doc.pinLockedUntil?.toISOString(),
    emailVerifiedAt: doc.emailVerifiedAt?.toISOString(),
    phoneVerifiedAt: doc.phoneVerifiedAt?.toISOString(),
    isActive: doc.isActive !== false,
    idTag: doc.idTag ?? undefined,
    locale: doc.locale ?? 'en',
    tokenVersion: doc.tokenVersion ?? 0,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
    lastLoginAt: doc.lastLoginAt?.toISOString(),
  };
}

function toToken(doc: VerificationTokenDoc): StoredToken {
  return {
    id: String(doc._id),
    userId: doc.userId,
    kind: doc.kind,
    secretHash: doc.secretHash,
    channel: doc.channel,
    destination: doc.destination,
    expiresAt: doc.expiresAt.toISOString(),
    attempts: doc.attempts ?? 0,
    usedAt: doc.usedAt?.toISOString(),
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Maps a `StoredUser` patch onto the Mongo document shape. */
function toUpdate(patch: Partial<StoredUser>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  const dates = ['emailVerifiedAt', 'phoneVerifiedAt', 'lastLoginAt', 'pinLockedUntil'] as const;

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    if (value === undefined || value === null) {
      unset[key] = 1;
      continue;
    }
    update[key] = (dates as readonly string[]).includes(key) ? new Date(value as string) : value;
  }

  if (Object.keys(unset).length > 0) {
    return { $set: update, $unset: unset };
  }
  return update;
}

let indexesReady: Promise<void> | null = null;

/**
 * Brings the driver indexes in line with the schema once per process.
 *
 * Deployments before PIN sign-in built `email_1` as unique across every
 * document and `phone_1` as a plain sparse index. Neither fits now — an account
 * without an email would collide with every other one — and Mongo refuses to
 * build an index whose name is taken by one with different options, so the old
 * ones are dropped first.
 */
async function ensureIndexes(): Promise<void> {
  const collection = DriverUser.collection;
  const existing = await collection.indexes().catch(() => []);
  for (const name of ['email_1', 'phone_1']) {
    const index = existing.find((candidate) => candidate.name === name);
    if (index && !index.partialFilterExpression) {
      await collection.dropIndex(name).catch(() => undefined);
    }
  }
  try {
    await DriverUser.createIndexes();
  } catch (err) {
    // Most likely two accounts share a phone number. Sign-in still works; the
    // duplicates need resolving by hand before the index can be built.
    console.error('[accounts] could not build driver user indexes', err);
  }
}

async function ready(): Promise<void> {
  await connectMongo();
  indexesReady ??= ensureIndexes().catch((err) => {
    indexesReady = null;
    throw err;
  });
  await indexesReady;
}

export const mongoStore: UserStore = {
  kind: 'mongo',

  async findUserById(id) {
    await ready();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await DriverUser.findById(id).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async findUserByEmail(email) {
    await ready();
    const doc = await DriverUser.findOne({ email: email.toLowerCase() }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async findUserByPhone(phone) {
    await ready();
    const doc = await DriverUser.findOne({ phone }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async createUser(input: NewUser) {
    await ready();
    const doc = await DriverUser.create({
      email: input.email?.toLowerCase(),
      phone: input.phone,
      phoneVerifiedAt: input.phoneVerifiedAt ? new Date(input.phoneVerifiedAt) : undefined,
      name: input.name,
      pinHash: input.pinHash,
      locale: input.locale ?? 'en',
    });
    return toUser(doc.toObject() as DriverUserDoc);
  },

  async updateUser(id, patch) {
    await ready();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await DriverUser.findByIdAndUpdate(id, toUpdate(patch), {
      new: true,
    }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async createToken(input: NewToken) {
    await ready();
    const doc = await VerificationToken.create({ ...input, expiresAt: input.expiresAt });
    return toToken(doc.toObject() as VerificationTokenDoc);
  },

  async findTokenById(id) {
    await ready();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await VerificationToken.findById(id).lean<VerificationTokenDoc>();
    return doc ? toToken(doc) : null;
  },

  async findActiveTokens(userId: string, kind: TokenKind) {
    await ready();
    const docs = await VerificationToken.find({
      userId,
      kind,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean<VerificationTokenDoc[]>();
    return docs.map(toToken);
  },

  async markTokenUsed(id) {
    await ready();
    await VerificationToken.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  },

  async incrementTokenAttempts(id) {
    await ready();
    const doc = await VerificationToken.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { new: true },
    ).lean<VerificationTokenDoc>();
    return doc?.attempts ?? 0;
  },

  async invalidateTokens(userId, kind) {
    await ready();
    await VerificationToken.updateMany(
      { userId, kind, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );
  },

  async countTokensSince(userId, kind, since) {
    await ready();
    return VerificationToken.countDocuments({ userId, kind, createdAt: { $gte: since } });
  },
};
