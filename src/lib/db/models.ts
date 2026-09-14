import { Schema, model, models, type Model } from 'mongoose';

/**
 * Driver accounts live in their own collections so the CSMS operator users
 * (`users`) in ../evChargerBack are untouched.
 */
const driverUserSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true },
    passwordHash: { type: String },
    pinHash: { type: String },
    failedPinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    idTag: { type: String, index: true, sparse: true },
    locale: { type: String, default: 'en' },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: 'driverusers' },
);

// Unique only where present: an account may have no email, and before PIN
// sign-in the phone number was optional too. The phone number is the sign-in
// identity, so two accounts must never share one.
driverUserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
driverUserSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);

const verificationTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: {
      type: String,
      required: true,
      enum: ['email_verify', 'password_reset', 'phone_verify'],
    },
    secretHash: { type: String, required: true },
    channel: { type: String, required: true, enum: ['email', 'sms'] },
    destination: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date },
  },
  { timestamps: true, collection: 'driververificationtokens' },
);

// Expired tokens are swept by Mongo itself.
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
verificationTokenSchema.index({ userId: 1, kind: 1, usedAt: 1 });

export interface DriverUserDoc {
  _id: unknown;
  email?: string;
  phone?: string;
  name?: string;
  passwordHash?: string;
  pinHash?: string;
  failedPinAttempts?: number;
  pinLockedUntil?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  isActive: boolean;
  idTag?: string;
  locale: string;
  tokenVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationTokenDoc {
  _id: unknown;
  userId: string;
  kind: 'email_verify' | 'password_reset' | 'phone_verify';
  secretHash: string;
  channel: 'email' | 'sms';
  destination: string;
  expiresAt: Date;
  attempts: number;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DriverUser: Model<DriverUserDoc> =
  (models.DriverUser as Model<DriverUserDoc>) ??
  model<DriverUserDoc>('DriverUser', driverUserSchema);

export const VerificationToken: Model<VerificationTokenDoc> =
  (models.VerificationToken as Model<VerificationTokenDoc>) ??
  model<VerificationTokenDoc>('VerificationToken', verificationTokenSchema);
