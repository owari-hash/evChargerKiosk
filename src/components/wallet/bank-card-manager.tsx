'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Field } from '@/components/ui';

export interface BankCardItem {
  id: string;
  brand: 'VISA' | 'MASTERCARD';
  bankName: string;
  cardNumber: string; // e.g. "•••• •••• •••• 4588"
  last4: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  isPrimary: boolean;
  theme: 'obsidian' | 'emerald' | 'gold' | 'midnight';
}

const STORAGE_KEY = 'ev_saved_bank_cards';

const INITIAL_CARDS: BankCardItem[] = [
  {
    id: 'card-default-1',
    brand: 'VISA',
    bankName: 'Голомт Банк',
    cardNumber: '•••• •••• •••• 4588',
    last4: '4588',
    holderName: 'BAT-ERDENE B',
    expMonth: '08',
    expYear: '28',
    isPrimary: true,
    theme: 'obsidian',
  },
  {
    id: 'card-default-2',
    brand: 'MASTERCARD',
    bankName: 'Хаан Банк',
    cardNumber: '•••• •••• •••• 8821',
    last4: '8821',
    holderName: 'BAT-ERDENE B',
    expMonth: '11',
    expYear: '27',
    isPrimary: false,
    theme: 'gold',
  },
];

export function VisaIcon({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.626 0.283997L8.93701 11.716H5.85601L3.58201 2.508C3.45001 1.992 3.31801 1.8 2.89801 1.572C2.19001 1.188 1.02601 0.815997 0.0540039 0.611997L0.126004 0.283997H4.96201C5.61001 0.283997 6.18601 0.715997 6.33001 1.44L7.54201 7.896L10.554 0.283997H13.626ZM25.47 8.232C25.482 5.124 21.138 4.944 21.162 3.552C21.174 3.132 21.582 2.676 22.518 2.556C22.974 2.496 24.27 2.448 25.554 3.036L26.094 0.515997C25.356 0.251997 24.408 0 23.238 0C20.406 0 18.396 1.488 18.372 3.612C18.348 5.184 19.782 6.06 20.862 6.588C21.972 7.128 22.344 7.476 22.332 7.968C22.32 8.712 21.432 9.048 20.604 9.06C19.164 9.084 18.324 8.676 17.658 8.364L17.1 10.968C17.814 11.292 19.14 11.568 20.52 11.592C23.514 11.592 25.458 10.128 25.47 8.232ZM33.006 11.716H35.688L33.342 0.283997H30.87C30.294 0.283997 29.808 0.619997 29.592 1.14L25.308 11.716H28.536L29.184 9.93601H33.15L33.006 11.716ZM30.072 7.512L31.428 3.792L32.208 7.512H30.072ZM17.754 0.283997L15.342 11.716H12.27L14.682 0.283997H17.754Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MastercardIcon({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="12" r="11" fill="#EB001B" />
      <circle cx="25" cy="12" r="11" fill="#F79E1B" fillOpacity="0.9" />
      <path
        d="M19 4.88184C20.916 6.64332 22.125 9.17646 22.125 12C22.125 14.8235 20.916 17.3567 19 19.1182C17.084 17.3567 15.875 14.8235 15.875 12C15.875 9.17646 17.084 6.64332 19 4.88184Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function EMVChip({ className = 'h-7 w-9' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 p-0.5 shadow-sm ring-1 ring-amber-500/50 ${className}`}
    >
      <div className="grid h-full w-full grid-cols-2 gap-0.5 opacity-50">
        <div className="border-b border-r border-amber-900/60" />
        <div className="border-b border-amber-900/60" />
        <div className="border-r border-amber-900/60" />
        <div className="border-amber-900/60" />
      </div>
    </div>
  );
}

export function ContactlessWave({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8.5 14.5A4 4 0 0 1 8.5 9.5" />
      <path d="M12 17A7.5 7.5 0 0 0 12 7" />
      <path d="M15.5 19.5A11 11 0 0 0 15.5 4.5" />
    </svg>
  );
}

const THEME_STYLES = {
  obsidian: 'bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white ring-1 ring-white/15 shadow-xl',
  gold: 'bg-gradient-to-br from-amber-950 via-neutral-900 to-zinc-950 text-amber-100 ring-1 ring-amber-500/30 shadow-xl',
  emerald: 'bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-emerald-100 ring-1 ring-emerald-500/30 shadow-xl',
  midnight: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-blue-100 ring-1 ring-indigo-500/30 shadow-xl',
};

export function BankCardManager() {
  const [cards, setCards] = useState<BankCardItem[]>(INITIAL_CARDS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [bankName, setBankName] = useState('Голомт Банк');
  const [brand, setBrand] = useState<'VISA' | 'MASTERCARD'>('VISA');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
        }
      }
    } catch {
      // fallback to initial
    }
  }, []);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Save cards helper
  function updateAndSaveCards(newCards: BankCardItem[]) {
    setCards(newCards);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    } catch {
      // ignore quota error
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  // Handle Card Number Input & Auto-detect brand
  function handleCardNumberChange(rawVal: string) {
    const digits = rawVal.replace(/\D/g, '').slice(0, 16);
    if (digits.startsWith('4')) {
      setBrand('VISA');
    } else if (digits.startsWith('5')) {
      setBrand('MASTERCARD');
    }
    // format with spaces
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  }

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    const digitsOnly = cardNumber.replace(/\s/g, '');
    if (digitsOnly.length < 15) {
      showToast('Картын дугаарийг бүтэн оруулна уу');
      return;
    }
    const last4 = digitsOnly.slice(-4);
    const masked = `•••• •••• •••• ${last4}`;
    const themes: Array<'obsidian' | 'emerald' | 'gold' | 'midnight'> = [
      'obsidian',
      'emerald',
      'gold',
      'midnight',
    ];
    const chosenTheme = themes[cards.length % themes.length];

    const newCard: BankCardItem = {
      id: `card-${Date.now()}`,
      brand,
      bankName: bankName.trim() || 'Монгол Банк',
      cardNumber: masked,
      last4,
      holderName: (holderName.trim() || 'CARD HOLDER').toUpperCase(),
      expMonth: expMonth.padStart(2, '0') || '12',
      expYear: expYear.length === 4 ? expYear.slice(2) : expYear || '28',
      isPrimary: cards.length === 0,
      theme: chosenTheme,
    };

    const updated = [newCard, ...cards];
    updateAndSaveCards(updated);
    setIsModalOpen(false);

    // Reset Form
    setCardNumber('');
    setHolderName('');
    setExpMonth('');
    setExpYear('');
    setCvc('');
    showToast('Банкны карт амжилттай холбогдлоо!');
  }

  function handleSetPrimary(id: string) {
    const updated = cards.map((c) => ({
      ...c,
      isPrimary: c.id === id,
    }));
    updateAndSaveCards(updated);
    showToast('Үндсэн карт солигдлоо!');
  }

  function handleDeleteCard(id: string) {
    const updated = cards.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
      updated[0].isPrimary = true;
    }
    updateAndSaveCards(updated);
    showToast('Банкны карт салгагдлаа');
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          <span className="text-base">✓</span> {toastMsg}
        </div>
      )}

      {/* Header & Main Connect Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Холбогдсон банкны картууд</span>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
            {cards.length} карт
          </span>
        </div>

        {/* Primary CTA: Банкны карт холбох with Visa & Mastercard logos */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-contrast shadow-md ring-1 ring-brand/30 transition-all hover:scale-[1.02] hover:bg-brand-strong active:scale-95"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-base leading-none">+</span>
            <span>Банкны карт холбох</span>
          </span>
          <div className="flex items-center gap-1.5 border-l border-white/20 pl-2">
            <VisaIcon className="h-3.5 w-auto text-white" />
            <MastercardIcon className="h-3.5 w-auto" />
          </div>
        </button>
      </div>

      {/* Cards List Grid */}
      {cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-2xl ${
                THEME_STYLES[card.theme]
              }`}
            >
              {/* Glossy Overlay effect */}
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />

              {/* Card Top Row: Bank Name, Primary Tag, Brand Logo */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide opacity-80">{card.bankName}</p>
                  {card.isPrimary && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Үндсэн карт
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ContactlessWave className="h-4 w-4 opacity-70" />
                  {card.brand === 'VISA' ? (
                    <VisaIcon className="h-4 w-auto text-white" />
                  ) : (
                    <MastercardIcon className="h-5 w-auto" />
                  )}
                </div>
              </div>

              {/* Card Middle: EMV Chip & Number */}
              <div className="mt-5 space-y-2">
                <EMVChip />
                <p className="font-mono text-base font-bold tracking-widest text-white/95 drop-shadow-sm sm:text-lg">
                  {card.cardNumber}
                </p>
              </div>

              {/* Card Bottom: Holder Name, Expiry & Actions */}
              <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider opacity-60">Эзэмшигч</p>
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-white">
                    {card.holderName}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider opacity-60">Хугацаа</p>
                  <p className="font-mono text-xs font-semibold text-white">
                    {card.expMonth}/{card.expYear}
                  </p>
                </div>
              </div>

              {/* Quick Card Action Toolbar */}
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-2 text-[11px]">
                {!card.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(card.id)}
                    className="font-medium text-white/80 hover:text-white underline underline-offset-2 transition"
                  >
                    Үндсэн болгох
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id)}
                  className="font-medium text-red-300/80 hover:text-red-200 underline underline-offset-2 transition"
                >
                  Салгах
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted">Одоогоор холбосон банкны карт алга байна.</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-contrast"
          >
            + Банкны карт холбох (Visa / Mastercard)
          </button>
        </div>
      )}

      {/* Modal: Банкны карт холбох */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl ring-1 ring-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Банкны карт холбох</h3>
                <p className="text-xs text-muted">Виза болон Мастер картыг аюулгүй холбоно</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1">
                  <VisaIcon className="h-3.5 w-auto text-brand" />
                  <MastercardIcon className="h-4 w-auto" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Live Card Preview */}
            <div className="my-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-4 text-white shadow-lg ring-1 ring-white/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-70">{bankName || 'Банкны нэр'}</span>
                {brand === 'VISA' ? (
                  <VisaIcon className="h-4 w-auto text-white" />
                ) : (
                  <MastercardIcon className="h-5 w-auto" />
                )}
              </div>
              <div className="my-3 space-y-1">
                <EMVChip className="h-6 w-8" />
                <p className="font-mono text-sm font-bold tracking-widest text-white/90">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
              </div>
              <div className="flex justify-between text-[10px] text-white/70">
                <span className="uppercase">{holderName || 'CARD HOLDER'}</span>
                <span className="font-mono">
                  {expMonth || 'MM'}/{expYear || 'YY'}
                </span>
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleAddCard} className="space-y-3">
              <Field label="Банк сонгох" htmlFor="bankName">
                <select
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="Голомт Банк">Голомт Банк (Golomt Bank)</option>
                  <option value="Хаан Банк">Хаан Банк (Khan Bank)</option>
                  <option value="Худалдаа Хөгжлийн Банк">Худалдаа Хөгжлийн Банк (TDB)</option>
                  <option value="ХасБанк">ХасБанк (XacBank)</option>
                  <option value="Төрийн Банк">Төрийн Банк (State Bank)</option>
                  <option value="Капитрон Банк">Капитрон Банк (Capitron)</option>
                </select>
              </Field>

              <Field label="Картын дугаар (16 орон)" htmlFor="cardNumber">
                <div className="relative">
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="4000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    maxLength={19}
                    required
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1">
                    {brand === 'VISA' ? (
                      <VisaIcon className="h-4 w-auto text-brand" />
                    ) : (
                      <MastercardIcon className="h-4 w-auto" />
                    )}
                  </div>
                </div>
              </Field>

              <Field label="Карт эзэмшигчийн нэр" htmlFor="holderName">
                <Input
                  id="holderName"
                  type="text"
                  placeholder="BAT-ERDENE B"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  required
                />
              </Field>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Сараар" htmlFor="expMonth">
                  <Input
                    id="expMonth"
                    type="text"
                    placeholder="08"
                    maxLength={2}
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </Field>
                <Field label="Оноор" htmlFor="expYear">
                  <Input
                    id="expYear"
                    type="text"
                    placeholder="28"
                    maxLength={2}
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </Field>
                <Field label="CVC/CVV" htmlFor="cvc">
                  <Input
                    id="cvc"
                    type="password"
                    placeholder="•••"
                    maxLength={3}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </Field>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" size="md">
                  Банкны карт холбох
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
