import { connectMongo } from './mongoose';
import { DriverUser, VerificationToken, type DriverUserDoc, type VerificationTokenDoc } from './models';
import type { NewToken, NewUser, StoredToken, StoredUser, TokenKind, UserStore } from './types';

function toUser(doc: DriverUserDoc): StoredUser {
  return {
    id: String(doc._id),
    email: doc.email,
    phone: doc.phone || undefined,
    name: doc.name || undefined,
    passwordHash: doc.passwordHash,
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
  const dates = ['emailVerifiedAt', 'phoneVerifiedAt', 'lastLoginAt'] as const;
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || value === undefined) continue;
    update[key] = (dates as readonly string[]).includes(key) ? new Date(value as string) : value;
  }
  return update;
}

export const mongoStore: UserStore = {
  kind: 'mongo',

  async findUserById(id) {
    await connectMongo();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await DriverUser.findById(id).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async findUserByEmail(email) {
    await connectMongo();
    const doc = await DriverUser.findOne({ email: email.toLowerCase() }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async findUserByPhone(phone) {
    await connectMongo();
    const doc = await DriverUser.findOne({ phone }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async createUser(input: NewUser) {
    await connectMongo();
    const doc = await DriverUser.create({
      email: input.email.toLowerCase(),
      phone: input.phone,
      name: input.name,
      passwordHash: input.passwordHash,
      locale: input.locale ?? 'en',
    });
    return toUser(doc.toObject() as DriverUserDoc);
  },

  async updateUser(id, patch) {
    await connectMongo();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await DriverUser.findByIdAndUpdate(id, toUpdate(patch), {
      new: true,
    }).lean<DriverUserDoc>();
    return doc ? toUser(doc) : null;
  },

  async createToken(input: NewToken) {
    await connectMongo();
    const doc = await VerificationToken.create({ ...input, expiresAt: input.expiresAt });
    return toToken(doc.toObject() as VerificationTokenDoc);
  },

  async findTokenById(id) {
    await connectMongo();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await VerificationToken.findById(id).lean<VerificationTokenDoc>();
    return doc ? toToken(doc) : null;
  },

  async findActiveTokens(userId: string, kind: TokenKind) {
    await connectMongo();
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
    await connectMongo();
    await VerificationToken.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  },

  async incrementTokenAttempts(id) {
    await connectMongo();
    const doc = await VerificationToken.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { new: true },
    ).lean<VerificationTokenDoc>();
    return doc?.attempts ?? 0;
  },

  async invalidateTokens(userId, kind) {
    await connectMongo();
    await VerificationToken.updateMany(
      { userId, kind, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );
  },

  async countTokensSince(userId, kind, since) {
    await connectMongo();
    return VerificationToken.countDocuments({ userId, kind, createdAt: { $gte: since } });
  },
};
