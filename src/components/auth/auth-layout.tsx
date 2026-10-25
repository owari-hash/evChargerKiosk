import Link from 'next/link';
import type { ReactNode } from 'react';
import { DEFAULT_CONTACT_INFO, getContactInfo } from '@/lib/driver-api';
import { getTranslations } from '@/lib/i18n';
import { AuthTabs } from './auth-tabs';
import { AuthVisual } from './auth-visual';

/**
 * The frame shared by sign-in, sign-up and PIN reset: a brand panel beside the
 * card on wide screens, the card alone on a phone. It is rendered by the
 * (auth) route group's layout, so switching between those pages keeps the
 * panel, the card and the switch in place and only swaps the form.
 */
export async function AuthFrame({ children }: { children: ReactNode }) {
  const [{ d, locale }, contact] = await Promise.all([
    getTranslations(),
    getContactInfo().catch(() => DEFAULT_CONTACT_INFO),
  ]);
  // Same number as the footer's «Холбоо барих»; the first one if several.
  const phone = contact.phone ? contact.phone.split(',')[0].trim() : '';
  const tel = phone.replace(/\s+/g, '');

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:items-center lg:py-12">
      <div className="grid gap-10 lg:w-full lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        {/* Always the dark green panel, in light mode too. It used to carry
            `glass-hero`, whose background-image replaced this gradient with a
            white sheen, so in light mode the panel faded into the page and
            its white text vanished. The sheen is now its own layer on top. */}
        <aside className="auth-rise relative hidden flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#123324] via-[#0b2119] to-[#061a13] p-10 text-white shadow-2xl shadow-black/20 ring-1 ring-white/10 lg:flex lg:h-[620px]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.07),rgb(255_255_255/0)_45%)]"
          />
          <span aria-hidden className="glass-orb -right-28 -top-28 size-[26rem] bg-[#1f8a56]" />
          <span aria-hidden className="glass-orb -bottom-36 -left-24 size-[26rem] bg-[#4fd896]" />
          <AuthVisual
            charging={d.auth.visualCharging}
            slide1Title={d.auth.visualSlide1Title}
            slide1Body={d.auth.visualSlide1Body}
            slide2Title={d.auth.visualSlide2Title}
            slide2Body={d.auth.visualSlide2Body}
            slide3Title={d.auth.visualSlide3Title}
            slide3Body={d.auth.visualSlide3Body}
          />
        </aside>

        <section className="auth-rise mx-auto flex w-full max-w-md flex-col [animation-delay:90ms]">
          <div data-slot="card" className="glass-hero flex flex-col justify-center rounded-[1.75rem] p-6 sm:p-8 lg:h-[620px]">
            <AuthTabs signIn={d.common.signIn} createAccount={d.common.createAccount} />
            {children}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            <Link href="/help" className="font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
              {d.auth.login.helpCenter}
            </Link>
            {phone && (
              <>
                <span aria-hidden className="text-muted/50">·</span>
                <a
                  href={`tel:${tel}`}
                  className="inline-flex items-center gap-1.5 font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                >
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                  </svg>
                  {locale === 'en' ? 'Contact' : 'Холбоо барих'}: {phone}
                </a>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** The page's title and the line under it, at the top of the card. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-7">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </header>
  );
}
