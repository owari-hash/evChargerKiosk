import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NewToken, NewUser, StoredToken, StoredUser, TokenKind, UserStore } from './types';

/**
 * Zero-infrastructure fallback so the sign-up / reset flows can be exercised
 * before MongoDB is running. Never selected when NODE_ENV=production.
 */
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'driver-accounts.json');

interface FileShape {
  users: StoredUser[];
  tokens: StoredToken[];
}

const empty: FileShape = { users: [], tokens: [] };

// Serialises read-modify-write cycles; a single dev process is the only writer.
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<FileShape> {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FileShape>;
    return { users: parsed.users ?? [], tokens: parsed.tokens ?? [] };
  } catch {
    return { ...empty };
  }
}

async function write(data: FileShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function transact<T>(fn: (data: FileShape) => Promise<T> | T): Promise<T> {
  const next = queue.then(async () => {
    const data = await read();
    const result = await fn(data);
    await write(data);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();

export const fileStore: UserStore = {
  kind: 'file',

  async findUserById(id) {
    const { users } = await read();
    return users.find((u) => u.id === id) ?? null;
  },

  async findUserByEmail(email) {
    const { users } = await read();
    const needle = email.toLowerCase();
    return users.find((u) => u.email === needle) ?? null;
  },

  async findUserByPhone(phone) {
    const { users } = await read();
    return users.find((u) => u.phone === phone) ?? null;
  },

  async createUser(input: NewUser) {
    return transact((data) => {
      const user: StoredUser = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        phone: input.phone,
        name: input.name,
        passwordHash: input.passwordHash,
        isActive: true,
        idTag: input.idTag,
        locale: input.locale ?? 'en',
        tokenVersion: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      data.users.push(user);
      return user;
    });
  },

  async updateUser(id, patch) {
    return transact((data) => {
      const user = data.users.find((u) => u.id === id);
      if (!user) return null;
      Object.assign(user, patch, { id: user.id, createdAt: user.createdAt, updatedAt: now() });
      return { ...user };
    });
  },

  async createToken(input: NewToken) {
    return transact((data) => {
      const token: StoredToken = {
        id: randomUUID(),
        userId: input.userId,
        kind: input.kind,
        secretHash: input.secretHash,
        channel: input.channel,
        destination: input.destination,
        expiresAt: input.expiresAt.toISOString(),
        attempts: 0,
        createdAt: now(),
      };
      data.tokens.push(token);
      // Keep the dev file from growing without bound.
      if (data.tokens.length > 500) data.tokens.splice(0, data.tokens.length - 500);
      return token;
    });
  },

  async findTokenById(id) {
    const { tokens } = await read();
    return tokens.find((t) => t.id === id) ?? null;
  },

  async findActiveTokens(userId: string, kind: TokenKind) {
    const { tokens } = await read();
    return tokens
      .filter(
        (t) =>
          t.userId === userId &&
          t.kind === kind &&
          !t.usedAt &&
          new Date(t.expiresAt).getTime() > Date.now(),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async markTokenUsed(id) {
    await transact((data) => {
      const token = data.tokens.find((t) => t.id === id);
      if (token) token.usedAt = now();
    });
  },

  async incrementTokenAttempts(id) {
    return transact((data) => {
      const token = data.tokens.find((t) => t.id === id);
      if (!token) return 0;
      token.attempts += 1;
      return token.attempts;
    });
  },

  async invalidateTokens(userId, kind) {
    await transact((data) => {
      for (const token of data.tokens) {
        if (token.userId === userId && token.kind === kind && !token.usedAt) token.usedAt = now();
      }
    });
  },

  async countTokensSince(userId, kind, since) {
    const { tokens } = await read();
    return tokens.filter(
      (t) => t.userId === userId && t.kind === kind && new Date(t.createdAt) >= since,
    ).length;
  },
};
