import mongoose from 'mongoose';
import { serverEnv } from '@/lib/env';

/**
 * Next.js reloads modules on every edit in dev, so the connection is cached on
 * `globalThis` to avoid opening a new pool per hot reload.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { __evappMongoose?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.__evappMongoose ??= {
  conn: null,
  promise: null,
});

export async function connectMongo(): Promise<typeof mongoose> {
  const uri = serverEnv.mongoUri();
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose
    .connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    })
    .catch((err: unknown) => {
      // Clear the cached promise so the next request can retry a failed connect.
      cache.promise = null;
      throw err;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}
