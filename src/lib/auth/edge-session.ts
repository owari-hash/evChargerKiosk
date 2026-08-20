import { jwtVerify } from 'jose';
import { requireSessionSecret } from '@/lib/env';

/**
 * Signature-only session check for `middleware.ts`.
 *
 * The Edge runtime cannot open a Mongo connection, so this deliberately does not
 * import the account store — it only proves the cookie was issued by us. Pages and
 * route handlers still call `getCurrentUser()`, which re-checks that the account
 * exists, is active, and has a matching tokenVersion.
 */
export async function hasValidSessionSignature(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(requireSessionSecret()));
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}
