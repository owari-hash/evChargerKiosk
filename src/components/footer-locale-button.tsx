'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE } from '@/lib/i18n/config';

export function FooterLocaleButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isMn = locale === 'mn';
  const next = isMn ? 'en' : 'mn';
  const label = isMn ? 'Мон' : 'Eng';

  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title="Хэл солих / Switch language"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
    >
      <span>{label}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
      >
        <path d="m16 3 4 4-4 4" />
        <path d="M20 7H4" />
        <path d="m8 21-4-4 4-4" />
        <path d="M4 17h16" />
      </svg>
    </button>
  );
}
