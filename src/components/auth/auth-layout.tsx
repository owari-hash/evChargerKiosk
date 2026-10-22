import Link from 'next/link';
import type { ReactNode } from 'react';
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
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:items-center lg:py-12">
      <div className="grid gap-10 lg:w-full lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <aside className="auth-rise glass-hero relative hidden flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#123324] via-[#0b2119] to-[#061a13] p-10 text-white ring-1 ring-white/10 lg:flex lg:h-[620px]">
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
          <div className="mt-5 text-center text-sm">
            <Link href="/help" className="font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
              {d.auth.login.helpCenter}
            </Link>
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
