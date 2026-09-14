import { SignJWT, jwtVerify } from 'jose';
import { requireSessionSecret } from '@/lib/env';

/**
 * Proof that the caller typed the SMS code sent to a phone number, carried from
 * the "enter the code" step to the "create a PIN" step. Short-lived and scoped
 * to one purpose, so a sign-up ticket cannot be replayed as a PIN reset.
 */
export type TicketPurpose = 'signup' | 'pin_reset';

export const TICKET_MINUTES = 15;

export interface PhoneTicket {
  phone: string;
  /** For a PIN reset: the account's tokenVersion, so a used ticket cannot reset twice. */
  v?: number;
}

function key(): Uint8Array {
  return new TextEncoder().encode(requireSessionSecret());
}

export function issuePhoneTicket(purpose: TicketPurpose, ticket: PhoneTicket): Promise<string> {
  return new SignJWT(ticket.v === undefined ? {} : { v: ticket.v })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(`evapp:${purpose}`)
    .setSubject(ticket.phone)
    .setIssuedAt()
    .setExpirationTime(`${TICKET_MINUTES}m`)
    .sign(key());
}

export async function readPhoneTicket(
  purpose: TicketPurpose,
  token: string,
): Promise<PhoneTicket | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { audience: `evapp:${purpose}` });
    if (!payload.sub) return null;
    return { phone: payload.sub, v: typeof payload.v === 'number' ? payload.v : undefined };
  } catch {
    return null;
  }
}
