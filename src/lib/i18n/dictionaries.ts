import { DEFAULT_LOCALE, type Locale } from './config';
import type { ConnectorStatus, StationAvailability } from '@/lib/types';

/**
 * All user-facing copy lives here. `en` is the shape of record — every key must
 * also exist in `mn`, which TypeScript enforces via the `Dictionary` annotation.
 *
 * Keep keys grouped by the surface they appear on. Interpolation uses {name}
 * placeholders resolved by `format()` in ./index.ts.
 */
export const en = {
  common: {
    appTagline: 'Charge your car with confidence',
    signIn: 'Sign in',
    signOut: 'Sign out',
    createAccount: 'Create account',
    myAccount: 'My account',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    retry: 'Try again',
    loading: 'Loading…',
    search: 'Search',
    clear: 'Clear',
    remove: 'Remove',
    add: 'Add',
    confirm: 'Confirm',
    optional: 'optional',
    required: 'required',
    somethingWentWrong: 'Something went wrong. Please try again.',
    networkError: 'We could not reach the server. Check your connection and try again.',
    toggleNav: 'Toggle navigation',
    toggleTheme: 'Switch theme',
    language: 'Language',
  },

  nav: {
    home: 'Home',
    stations: 'Find a charger',
    pricing: 'Pricing',
    help: 'Help',
  },

  footer: {
    rights: '© {year} {brand}. Charging network powered by OCPP 1.6J.',
    terms: 'Terms',
    privacy: 'Privacy',
  },

  status: {
    connector: {
      Available: 'Available',
      Preparing: 'Preparing',
      Charging: 'Charging',
      SuspendedEV: 'Paused by car',
      SuspendedEVSE: 'Paused by station',
      Finishing: 'Finishing',
      Reserved: 'Reserved',
      Unavailable: 'Unavailable',
      Faulted: 'Out of order',
    } as Record<ConnectorStatus, string>,
    availability: {
      available: 'Available now',
      busy: 'All plugs in use',
      offline: 'Offline',
      unknown: 'Status unknown',
    } as Record<StationAvailability, string>,
  },
  account: {
    nav: {
      overview: 'Overview',
      wallet: 'Wallet',
      security: 'Security',
      sessions: 'Charging history',
    },
  },

  wallet: {
    title: 'Wallet',
    subtitle: 'Top your balance up with QPay and pay for charging automatically.',
    balance: 'Balance',
    balanceHint: 'Available to spend on charging',
    debt: 'Outstanding amount',
    debtHint: 'A session cost more than your balance. Top up to clear it.',
    frozen: 'This wallet is frozen. Please contact the operator.',
    toppedUp: 'Topped up in total',
    spent: 'Spent in total',
    linkedTags: 'Charge tags using this balance',
    noLinkedTags: 'No charge tag is linked yet. Link one under Overview.',
    lowBalance: 'Your balance is below {amount}. Top up before you charge.',
    unavailable: 'The wallet service is not available right now. Please try again shortly.',

    topUp: {
      title: 'Top up',
      chooseAmount: 'Choose an amount',
      customAmount: 'Or enter an amount',
      customPlaceholder: 'e.g. 15000',
      amountLabel: 'Amount (₮)',
      amountRange: 'Between {min} and {max}',
      submit: 'Top up',
      submitting: 'Creating invoice…',
      invalidAmount: 'Enter an amount',
      tooSmall: 'The smallest top-up is {min}',
      tooLarge: 'The largest top-up is {max}',
      disabled: 'Top-ups are temporarily unavailable.',
    },

    invoice: {
      title: 'Scan to pay',
      amount: 'Amount to pay',
      instruction: 'Scan the QR with your banking app, or pick your bank below.',
      openBank: 'Open banking app',
      waiting: 'Waiting for payment…',
      checkNow: 'I have paid',
      checking: 'Checking…',
      paid: '{amount} has been added to your wallet.',
      newBalance: 'New balance: {balance}',
      expired: 'This invoice has expired. Please start again.',
      canceled: 'This invoice was canceled.',
      failed: 'The invoice could not be created. Please try again.',
      notPaidYet: 'No payment has arrived yet. Try again in a moment.',
      startOver: 'Top up a different amount',
      expiresAt: 'Valid until {time}',
      qrAlt: 'QPay payment QR code',
    },

    history: {
      title: 'Wallet history',
      empty: 'No wallet activity yet.',
      viewAll: 'See all',
      type: {
        TOPUP: 'Top-up',
        CHARGE: 'Charging',
        REFUND: 'Refund',
        ADJUSTMENT: 'Adjustment',
        BONUS: 'Bonus',
      },
      balanceAfter: 'Balance: {balance}',
    },
  },
} as const;

/**
 * Widens the literal types `as const` gives `en` ('Sign in') back to `string`,
 * while keeping the key structure. Without this every translation is a type
 * error, because 'Нэвтрэх' is not assignable to the literal type '"Sign in"'.
 * Missing or misspelled keys in `mn` are still caught.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

export const mn: Dictionary = {
  common: {
    appTagline: 'Машинаа санаа амар цэнэглээрэй',
    signIn: 'Нэвтрэх',
    signOut: 'Гарах',
    createAccount: 'Бүртгүүлэх',
    myAccount: 'Миний бүртгэл',
    save: 'Хадгалах',
    saving: 'Хадгалж байна…',
    saved: 'Хадгаллаа',
    cancel: 'Цуцлах',
    close: 'Хаах',
    back: 'Буцах',
    retry: 'Дахин оролдох',
    loading: 'Ачааллаж байна…',
    search: 'Хайх',
    clear: 'Цэвэрлэх',
    remove: 'Устгах',
    add: 'Нэмэх',
    confirm: 'Баталгаажуулах',
    optional: 'заавал биш',
    required: 'заавал',
    somethingWentWrong: 'Алдаа гарлаа. Дахин оролдоно уу.',
    networkError: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
    toggleNav: 'Цэс нээх',
    toggleTheme: 'Загвар солих',
    language: 'Хэл',
  },

  nav: {
    home: 'Нүүр',
    stations: 'Цэнэглэх станц',
    pricing: 'Үнэ тариф',
    help: 'Тусламж',
  },

  footer: {
    rights: '© {year} {brand}. OCPP 1.6J дээр суурилсан цэнэглэх сүлжээ.',
    terms: 'Үйлчилгээний нөхцөл',
    privacy: 'Нууцлалын бодлого',
  },

  status: {
    connector: {
      Available: 'Сул байна',
      Preparing: 'Бэлтгэж байна',
      Charging: 'Цэнэглэж байна',
      SuspendedEV: 'Машин түр зогсоосон',
      SuspendedEVSE: 'Станц түр зогсоосон',
      Finishing: 'Дуусгаж байна',
      Reserved: 'Захиалагдсан',
      Unavailable: 'Боломжгүй',
      Faulted: 'Эвдэрсэн',
    },
    availability: {
      available: 'Одоо сул байна',
      busy: 'Бүх холбогч завгүй',
      offline: 'Холбогдоогүй',
      unknown: 'Төлөв тодорхойгүй',
    },
  },
  account: {
    nav: {
      overview: 'Ерөнхий',
      wallet: 'Хэтэвч',
      security: 'Аюулгүй байдал',
      sessions: 'Цэнэглэлтийн түүх',
    },
  },

  wallet: {
    title: 'Хэтэвч',
    subtitle: 'QPay-ээр үлдэгдлээ цэнэглээд цэнэглэлтийн төлбөрөө автоматаар төлөөрэй.',
    balance: 'Үлдэгдэл',
    balanceHint: 'Цэнэглэлтэд зарцуулах боломжтой',
    debt: 'Төлөх дүн',
    debtHint: 'Цэнэглэлтийн төлбөр үлдэгдлээс давсан байна. Цэнэглэж төлнө үү.',
    frozen: 'Энэ хэтэвч түр хаагдсан байна. Операторт хандана уу.',
    toppedUp: 'Нийт цэнэглэсэн',
    spent: 'Нийт зарцуулсан',
    linkedTags: 'Энэ үлдэгдлийг ашиглах картууд',
    noLinkedTags: 'Холбосон карт алга байна. «Ерөнхий» хэсгээс картаа холбоно уу.',
    lowBalance: 'Таны үлдэгдэл {amount}-өөс бага байна. Цэнэглэхийн өмнө хэтэвчээ цэнэглэнэ үү.',
    unavailable: 'Хэтэвчийн үйлчилгээ түр боломжгүй байна. Хэсэг хугацааны дараа дахин оролдоно уу.',

    topUp: {
      title: 'Цэнэглэх',
      chooseAmount: 'Дүнгээ сонгоно уу',
      customAmount: 'Эсвэл дүнгээ оруулна уу',
      customPlaceholder: 'жишээ нь 15000',
      amountLabel: 'Дүн (₮)',
      amountRange: '{min} – {max} хооронд',
      submit: 'Цэнэглэх',
      submitting: 'Нэхэмжлэх үүсгэж байна…',
      invalidAmount: 'Дүнгээ оруулна уу',
      tooSmall: 'Хамгийн бага цэнэглэлт {min}',
      tooLarge: 'Хамгийн их цэнэглэлт {max}',
      disabled: 'Цэнэглэх үйлчилгээ түр боломжгүй байна.',
    },

    invoice: {
      title: 'Уншуулж төлнө үү',
      amount: 'Төлөх дүн',
      instruction: 'QR кодыг банкны аппаараа уншуулах эсвэл доороос банкаа сонгоно уу.',
      openBank: 'Банкны апп нээх',
      waiting: 'Төлбөр хүлээж байна…',
      checkNow: 'Төлбөрөө хийсэн',
      checking: 'Шалгаж байна…',
      paid: '{amount} таны хэтэвчид нэмэгдлээ.',
      newBalance: 'Шинэ үлдэгдэл: {balance}',
      expired: 'Энэ нэхэмжлэхийн хугацаа дууссан байна. Дахин эхлүүлнэ үү.',
      canceled: 'Энэ нэхэмжлэх цуцлагдсан байна.',
      failed: 'Нэхэмжлэх үүсгэж чадсангүй. Дахин оролдоно уу.',
      notPaidYet: 'Төлбөр хараахан ирээгүй байна. Түр хүлээгээд дахин шалгана уу.',
      startOver: 'Өөр дүнгээр цэнэглэх',
      expiresAt: '{time} хүртэл хүчинтэй',
      qrAlt: 'QPay төлбөрийн QR код',
    },

    history: {
      title: 'Хэтэвчийн хөдөлгөөн',
      empty: 'Одоогоор хөдөлгөөн алга байна.',
      viewAll: 'Бүгдийг харах',
      type: {
        TOPUP: 'Цэнэглэлт',
        CHARGE: 'Цэнэглэлтийн төлбөр',
        REFUND: 'Буцаалт',
        ADJUSTMENT: 'Тохируулга',
        BONUS: 'Урамшуулал',
      },
      balanceAfter: 'Үлдэгдэл: {balance}',
    },
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { mn, en };

/**
 * Client-safe dictionary lookup. `@/lib/i18n` re-exports this alongside the
 * cookie-reading helpers, which are server-only.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
