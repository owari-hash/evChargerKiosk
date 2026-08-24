/** Persistence contracts for driver accounts. Implemented by Mongo and by a dev file store. */

export interface StoredUser {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  passwordHash: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  isActive: boolean;
  /**
   * The account's charge tag — the identity OCPP authorises against. Generated
   * at sign-up, one per account, and never shown as something to manage.
   */
  idTag?: string;
  locale: string;
  /** Bumped on password reset so existing session cookies stop validating. */
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type TokenKind = 'email_verify' | 'password_reset' | 'phone_verify';
export type TokenChannel = 'email' | 'sms';

export interface StoredToken {
  id: string;
  userId: string;
  kind: TokenKind;
  /** SHA-256 of the emailed link secret or of the SMS one-time code. */
  secretHash: string;
  channel: TokenChannel;
  /** Address the secret was sent to, so we can show "sent to j***@x.mn". */
  destination: string;
  expiresAt: string;
  attempts: number;
  usedAt?: string;
  createdAt: string;
}

export interface NewUser {
  email: string;
  phone?: string;
  name?: string;
  passwordHash: string;
  locale?: string;
  idTag?: string;
}

export interface NewToken {
  userId: string;
  kind: TokenKind;
  secretHash: string;
  channel: TokenChannel;
  destination: string;
  expiresAt: Date;
}

export interface UserStore {
  readonly kind: 'mongo' | 'file';

  findUserById(id: string): Promise<StoredUser | null>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserByPhone(phone: string): Promise<StoredUser | null>;
  createUser(input: NewUser): Promise<StoredUser>;
  updateUser(id: string, patch: Partial<StoredUser>): Promise<StoredUser | null>;

  createToken(input: NewToken): Promise<StoredToken>;
  findTokenById(id: string): Promise<StoredToken | null>;
  /** Unused, unexpired tokens for a user and kind, newest first. */
  findActiveTokens(userId: string, kind: TokenKind): Promise<StoredToken[]>;
  markTokenUsed(id: string): Promise<void>;
  incrementTokenAttempts(id: string): Promise<number>;
  invalidateTokens(userId: string, kind: TokenKind): Promise<void>;
  /** How many tokens of this kind were issued since `since` — used for throttling. */
  countTokensSince(userId: string, kind: TokenKind, since: Date): Promise<number>;
}
