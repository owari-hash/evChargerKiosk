/** Shared domain types for the driver-facing web app. */

export const CONNECTOR_STATUSES = [
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEV',
  'SuspendedEVSE',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted',
] as const;

export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

/** Physical plug standards we can present in the UI. */
export const CONNECTOR_TYPES = ['Type2', 'CCS2', 'CHAdeMO', 'GBT', 'Type1', 'Schuko'] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export type StationAvailability = 'available' | 'busy' | 'offline' | 'unknown';

export interface StationConnector {
  connectorId: number;
  status: ConnectorStatus;
  errorCode: string;
  availability: 'Operative' | 'Inoperative';
  type?: ConnectorType;
  powerKw?: number;
  currentTransactionId: number | null;
  lastPowerW?: number;
  lastSocPercent?: number;
  statusTimestamp?: string;
}

export interface Station {
  /** Stable identifier from the CSMS; survives the station being renamed. */
  id: string;
  /** The OCPP identifier operators and engineers know the station by. */
  cpId?: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tariffPerKwh?: number;
  vendor?: string;
  model?: string;
  tags: string[];
  isOnline: boolean;
  lastSeenAt?: string;
  connectors: StationConnector[];
  /** Derived summary fields, computed server-side so lists stay cheap. */
  totalConnectors: number;
  availableConnectors: number;
  maxPowerKw?: number;
  connectorTypes: ConnectorType[];
  availability: StationAvailability;
  /** Kilometres from the requested origin, when the query supplied one. */
  distanceKm?: number;
}

export interface EBarimtData {
  receiptId?: string;
  type: 'B2C_RECEIPT' | 'B2B_RECEIPT';
  qrData?: string;
  lottery?: string;
  merchantTin?: string;
  customerNo?: string;
  customerTin?: string;
  totalAmount: number;
  totalVAT: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  issuedAt?: string;
  error?: string;
}

export interface ChargingSession {
  transactionId: number;
  chargePointId: string;
  stationName?: string;
  connectorId: number;
  idTag: string;
  status: 'Active' | 'Completed' | 'Rejected';
  startTimestamp: string;
  stopTimestamp?: string;
  energyKwh: number;
  cost?: number;
  lastPowerW?: number;
  lastSocPercent?: number;
  stopReason?: string;
  ebarimt?: EBarimtData;
}

export interface PublicUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** False only on accounts from before PIN sign-in that have not set one yet. */
  hasPin: boolean;
  /** The account's charge tag; absent only until the CSMS has issued one. */
  idTag?: string;
  locale: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Prepaid wallet, as the driver API returns it
// ---------------------------------------------------------------------------

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
  connectorId?: number;
  idTag?: string;
  createdAt: string;
  ebarimt?: EBarimtData;
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
  walletOwnerType?: WalletOwnerType;
  walletOwnerId?: string;
  walletCreditedAt?: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED' | 'EXPIRED' | 'REFUNDED' | 'FAILED';
  amount: number;
  paidAmount: number;
  currency: string;
  description: string;
  qrText?: string;
  qrImage?: string;
  shortUrl?: string;
  deeplinks?: { name?: string; description?: string; logo?: string; link?: string }[];
  expiresAt?: string;
  createdAt: string;
}
