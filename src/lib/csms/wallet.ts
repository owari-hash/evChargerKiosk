import { csmsFetch } from './client';
import type { Paginated } from '@/lib/types';

/**
 * Prepaid wallet, read from the CSMS in `../evChargerBack`.
 *
 * Every call runs on the Next.js server: the CSMS needs an operator credential
 * that must never reach the browser. The driver's own /api/wallet routes are the
 * only thing the client talks to, and they scope each call to the signed-in
 * account before delegating here.
 */

export type WalletOwnerType = 'USER' | 'IDTAG';
export type WalletStatus = 'ACTIVE' | 'FROZEN';
export type WalletEntryType = 'TOPUP' | 'CHARGE' | 'REFUND' | 'ADJUSTMENT' | 'BONUS';

export interface Wallet {
  id: string;
  ownerType: WalletOwnerType;
  ownerId: string;
  balance: number;
  currency: string;
  status: WalletStatus;
  totalToppedUp: number;
  totalSpent: number;
  lastTopUpAt?: string;
  lastSpendAt?: string;
  /** Charge tags that spend from this wallet. */
  idTags?: string[];
}

export interface WalletEntry {
  id: string;
  type: WalletEntryType;
  /** Signed: positive credits the wallet, negative debits it. */
  amount: number;
  balanceAfter: number;
  currency: string;
  description?: string;
  paymentId?: string;
  transactionId?: number;
  chargePointId?: string;
  idTag?: string;
  createdAt: string;
}

export interface WalletConfig {
  enabled: boolean;
  currency: string;
  presets: number[];
  minTopUp: number;
  maxTopUp: number;
  minStartBalance: number;
  requireBalanceToStart: boolean;
  allowNegative: boolean;
  /** False when QPay is switched off — the top-up button has to be hidden. */
  topUpEnabled: boolean;
}

/** The QPay invoice a top-up creates; carries everything needed to show a QR. */
export interface TopUpInvoice {
  id: string;
  purpose?: 'CHARGING' | 'WALLET_TOPUP';
  /** Which wallet this invoice credits — checked before a driver may poll it. */
  walletOwnerType?: WalletOwnerType;
  walletOwnerId?: string;
  walletCreditedAt?: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED' | 'EXPIRED' | 'REFUNDED' | 'FAILED';
  amount: number;
  paidAmount: number;
  currency: string;
  description: string;
  qrText?: string;
  shortUrl?: string;
  deeplinks?: { name?: string; description?: string; logo?: string; link?: string }[];
  expiresAt?: string;
  createdAt: string;
}

/** Base64 PNG of the QR, fetched separately because of its size. */
export interface TopUpQr {
  id: string;
  status: TopUpInvoice['status'];
  qrText?: string;
  qrImage?: string;
  shortUrl?: string;
  deeplinks?: TopUpInvoice['deeplinks'];
}

const ownerPath = (ownerType: WalletOwnerType, ownerId: string) =>
  `/wallets/${ownerType}/${encodeURIComponent(ownerId)}`;

/** Wallet for a driver account, created empty by the CSMS on first read. */
export function getWallet(userId: string): Promise<Wallet> {
  return csmsFetch<Wallet>(ownerPath('USER', userId));
}

export function getWalletConfig(): Promise<WalletConfig> {
  return csmsFetch<WalletConfig>('/wallets/config');
}

export function listWalletEntries(
  userId: string,
  opts: { page?: number; limit?: number } = {},
): Promise<Paginated<WalletEntry>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 20),
  });
  return csmsFetch<Paginated<WalletEntry>>(`${ownerPath('USER', userId)}/entries?${params}`);
}

export interface CreateTopUpInput {
  userId: string;
  amount: number;
  /** Shown on the QPay invoice and on the ledger entry. */
  description?: string;
  /** Phone number or reference QPay bills against. */
  receiverCode?: string;
}

export function createTopUp(input: CreateTopUpInput): Promise<TopUpInvoice> {
  return csmsFetch<TopUpInvoice>(`${ownerPath('USER', input.userId)}/topup`, {
    method: 'POST',
    body: {
      amount: input.amount,
      description: input.description,
      receiverCode: input.receiverCode,
    },
  });
}

export function getTopUpQr(paymentId: string): Promise<TopUpQr> {
  return csmsFetch<TopUpQr>(`/payments/${encodeURIComponent(paymentId)}/qr`);
}

/**
 * Ask QPay whether the invoice has been paid. This is the client's polling
 * entry point, and the call that credits the wallet when payment lands.
 */
export function checkTopUp(paymentId: string): Promise<TopUpInvoice> {
  return csmsFetch<TopUpInvoice>(`/payments/${encodeURIComponent(paymentId)}/check`, {
    method: 'POST',
    body: {},
  });
}

export function getTopUp(paymentId: string): Promise<TopUpInvoice> {
  return csmsFetch<TopUpInvoice>(`/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * Point a charge tag at the account's wallet, so charging with that card draws
 * on the account balance. Best-effort by design: a tag the operator has not
 * created in the CSMS yet cannot be bound, and that must not block linking it
 * to the account.
 */
export async function bindIdTagToWallet(userId: string, idTag: string): Promise<boolean> {
  try {
    await csmsFetch(`${ownerPath('USER', userId)}/id-tags`, {
      method: 'POST',
      body: { idTag },
    });
    return true;
  } catch (err) {
    console.warn(`[wallet] could not bind idTag ${idTag} to wallet`, (err as Error).message);
    return false;
  }
}

export async function unbindIdTagFromWallet(userId: string, idTag: string): Promise<boolean> {
  try {
    await csmsFetch(`${ownerPath('USER', userId)}/id-tags/${encodeURIComponent(idTag)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    console.warn(`[wallet] could not unbind idTag ${idTag}`, (err as Error).message);
    return false;
  }
}
