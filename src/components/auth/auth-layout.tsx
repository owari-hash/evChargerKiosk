import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from '@/lib/i18n';
import { AuthTabs } from './auth-tabs';
import { ChargeVisual } from './charge-visual';

/**
 * The frame shared by sign-in, sign-up and PIN reset: a brand panel beside the
 * card on wide screens, the card alone on a phone. It is rendered by the
 * (auth) route group's layout, so switching between those pages keeps the
 * panel, the card and the switch in place and only swaps the form.
 */
export async function AuthFrame({ children }: { children: ReactNode }) {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-6 sm:py-10 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:py-12">
      <aside className="auth-rise relative hidden min-h-[580px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0b2418] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-28 size-[26rem] rounded-full bg-[radial-gradient(circle,rgb(37_162_105/0.45),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-36 -left-24 size-[26rem] rounded-full bg-[radial-gradient(circle,rgb(16_185_129/0.22),transparent_65%)]"
        />
        <p className="relative text-sm font-semibold tracking-wide text-emerald-200/80">Eplug</p>
        <ChargeVisual label={d.auth.visualCharging} />
        <div className="relative space-y-3">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">{d.auth.visualTitle}</h2>
          <p className="max-w-sm text-base leading-relaxed text-emerald-50/75">{d.auth.visualBody}</p>
        </div>
      </aside>

      <section className="auth-rise mx-auto w-full max-w-md [animation-delay:90ms]">
        <div className="rounded-[1.75rem] bg-surface/90 p-6 shadow-[var(--shadow-card)] ring-1 ring-border backdrop-blur-xl sm:p-8">
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
