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
  /** Operator's label for the physical gun, e.g. "Зүүн тал". */
  label?: string;
  currentTransactionId: number | null;
  /** Another driver has this gun (scanned it, starting, or charging). From `/live` only. */
  inUseByOther?: boolean;
  lastPowerW?: number;
  lastSocPercent?: number;
  /** Car charging here that reports its battery: estimated minutes until full. */
  minutesToFull?: number;
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
  /** What the driver pays per kWh, Eplug's service fee included. */
  tariffPerKwh?: number;
  /** The station's own tariff, before the service fee. */
  baseTariffPerKwh?: number;
  /** Service fee in percent; 0 when none applies. */
  feePercent?: number;
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
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  issuedAt?: string;
  error?: string;
}

/** A time-of-day rate. Minutes are Mongolia local time since midnight. */
export interface TariffZone {
  name?: string;
  startMinute: number;
  endMinute: number;
  tariffPerKwh: number;
}

export interface ChargingSession {
  /** Per kWh this session is billed at: the zone in effect now while running, the blended rate once finished. */
  tariffPerKwh?: number;
  /** Running sessions: name of the time-of-day zone being billed right now. */
  tariffZoneName?: string;
  /** Live feed only: an internal user, who charges free. */
  isInternal?: boolean;
  transactionId: number;
  chargePointId: string;
  stationName?: string;
  connectorId: number;
  idTag: string;
  /** `Refunded`: the charge was returned to the wallet (Буцаалт). */
  status: 'Active' | 'Completed' | 'Rejected' | 'Refunded';
  startTimestamp: string;
  stopTimestamp?: string;
  energyKwh: number;
  /** Total the driver pays, service fee included. */
  cost?: number;
  /** Breakdown of `cost`; absent on sessions from before the service fee. */
  energyCost?: number;
  feeAmount?: number;
  feePercent?: number;
  lastPowerW?: number;
  lastSocPercent?: number;
  /** Running sessions: estimated minutes until the battery is full (stations that report battery % only). */
  minutesToFull?: number;
  stopReason?: string;
  ebarimt?: EBarimtData;
  /** The receipt chosen when Charge was pressed; issued automatically at the end. */
  ebarimtRequest?: EbarimtChoice;
}

/** Personal or company e-barimt, chosen before the charge starts. */
export interface EbarimtChoice {
  type: 'B2C_RECEIPT' | 'B2B_RECEIPT';
  customerTin?: string;
  customerName?: string;
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
  /** The vehicle this driver charges — shown on an active session, not OCPP data. */
  vehicleBrand?: string;
  vehicleModel?: string;
  /** 8-digit E-Barimt user code or phone number for automatic easy registration. */
  ebarimtCustomerNo?: string;
  locale: string;
  createdAt: string;
  lastLoginAt?: string;
  /** First-run guides this account has not finished yet, e.g. 'app', 'web'. Absent on older APIs. */
  pendingGuides?: string[];
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
  /** False when QPay is switched off — the QR top-up has to be hidden. */
  topUpEnabled: boolean;
  /** Card / SocialPay top-up through Golomt's hosted page. */
  cardTopUpEnabled?: boolean;
  /** Cards can be saved on the bank page and charged in one tap later. */
  savedCardsEnabled?: boolean;
  /** SocialPay through Golomt: pay in the SocialPay app. */
  socialPayEnabled?: boolean;
}

/** A bank card saved for one-tap top-ups; the card number is masked by the bank. */
export interface SavedCard {
  id: string;
  cardNumber?: string;
  cardHolder?: string;
  bank?: string;
  lastUsedAt?: string;
  createdAt: string;
}

/** The QPay invoice a top-up creates; carries everything needed to show a QR. */
export interface TopUpInvoice {
  id: string;
  provider?: 'QPAY' | 'QPAY_QUICKQR' | 'GOLOMT';
  /** Golomt: paid by card on the bank page, or in the SocialPay app. */
  golomtChannel?: 'CARD' | 'SOCIALPAY';
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
  /** Golomt: the bank's hosted card page, and its SocialPay version. */
  paymentUrl?: string;
  socialPayUrl?: string;
  /** The ledger entry a settled top-up credited — its id keys the toast. */
  walletEntryId?: string;
  /** A declined card payment: the bank's own reason, in Mongolian. */
  declineReason?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address?: string;
  facebookUrl?: string;
  facebookName?: string;
  instagramUrl?: string;
  instagramName?: string;
  logoDownloadUrl?: string;
}
