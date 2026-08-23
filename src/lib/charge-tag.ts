import { randomInt } from 'node:crypto';

/**
 * The charge tag is the only identity OCPP understands: the station sends it in
 * `Authorize` and `StartTransaction`, and everything else — the account, the
 * wallet, the session history — hangs off it.
 *
 * One is generated per account at sign-up, so a driver never has to know it
 * exists. It is not derived from the account id on purpose: the tag travels in
 * the clear through OCPP logs and station displays, and it has to stay
 * replaceable if it ever leaks.
 */

/**
 * OCPP 1.6 caps an idTag at 20 characters (`CiString20Type`), which the CSMS
 * enforces. A generated tag stays well inside that.
 */
export const MAX_TAG_LENGTH = 20;

/**
 * No `0/O`, `1/I/L`, `5/S`, `2/Z` — a driver reading their tag to support over
 * the phone should not have to guess.
 */
const ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY';

const PREFIX = 'EV';
const BODY_LENGTH = 10;

/** A fresh tag, e.g. `EVK7QM4XRT9C`. */
export function generateChargeTag(): string {
  let body = '';
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}${body}`;
}

/** Groups the tag for display: `EVK7 QM4X RT9C` reads back far more reliably. */
export function formatChargeTag(tag: string): string {
  return tag.replace(/(.{4})/g, '$1 ').trim();
}
