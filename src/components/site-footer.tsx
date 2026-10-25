import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser, getContactInfo, DEFAULT_CONTACT_INFO } from '@/lib/driver-api';
import { publicEnv } from '@/lib/env';
import { format, getTranslations } from '@/lib/i18n';
import { FeedbackButton } from './feedback-button';
import { FooterLocaleButton } from './footer-locale-button';

export async function SiteFooter() {
  const [{ d, locale }, user, contact] = await Promise.all([
    getTranslations(),
    getCurrentUser().catch(() => null),
    getContactInfo().catch(() => DEFAULT_CONTACT_INFO),
  ]);

  const brandName = publicEnv.brandName || 'Eplug';
  const logoUrl = contact.logoDownloadUrl || '/eplug-mark.png';

  // Primary phone for tel: link (first number if comma-separated)
  const primaryPhone = contact.phone ? contact.phone.split(',')[0].trim().replace(/\s+/g, '') : '';

  return (
    <footer className="mt-auto border-t border-border bg-background/90 backdrop-blur-sm text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
          {/* Column 1: Brand & Logo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/eplug-mark.png"
                alt={brandName}
                width={36}
                height={36}
                className="size-9 rounded-xl object-contain shadow-sm"
              />
              <span className="text-base font-bold tracking-tight text-foreground">{brandName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <a
                href={logoUrl}
                download="eplug-logo.png"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-foreground transition hover:bg-surface-muted/80 active:scale-95"
              >
                <span>Лого татах</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5 text-muted"
                >
                  <path d="M12 5v14m0 0l-5-5m5 5l5-5" />
                </svg>
              </a>

              <FooterLocaleButton locale={locale} />
            </div>
          </div>

          {/* Column 2: Social Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {locale === 'en' ? 'Social links' : 'Сошиал хаяг'}
            </h3>
            <div className="space-y-2.5">
              {/* Facebook */}
              {contact.facebookUrl ? (
                <a
                  href={contact.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-85"
                >
                  <div>
                    <p className="text-[11px] font-medium text-muted">Facebook</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline">
                      {contact.facebookName || 'Eplug.mn'}
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                </a>
              ) : null}

              {/* Instagram */}
              {contact.instagramUrl ? (
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-85"
                >
                  <div>
                    <p className="text-[11px] font-medium text-muted">Instagram</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline">
                      {contact.instagramName || 'Eplug.mn'}
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </div>
                </a>
              ) : null}
            </div>
          </div>

          {/* Column 3: Contact Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {locale === 'en' ? 'Contact us' : 'Холбоо барих'}
            </h3>
            <div className="space-y-2.5">
              {/* Phone */}
              {contact.phone ? (
                <a
                  href={primaryPhone ? `tel:${primaryPhone}` : undefined}
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-85"
                >
                  <div>
                    <p className="text-[11px] font-medium text-muted">
                      {locale === 'en' ? 'Phone' : 'Утас'}
                    </p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline">
                      {contact.phone}
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                </a>
              ) : null}

              {/* Email */}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-85"
                >
                  <div>
                    <p className="text-[11px] font-medium text-muted">
                      {locale === 'en' ? 'Email' : 'И-мэйл'}
                    </p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary group-hover:underline">
                      {contact.email}
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition group-hover:border-primary/40 group-hover:bg-primary/5 group-hover:text-primary">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Copyright Bar */}
      <div className="border-t border-border py-3.5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted sm:flex-row sm:px-6">
          <p className="text-center sm:text-left">
            {format(d.footer.rights, {
              year: new Date().getFullYear(),
              brand: brandName,
            })}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <Link href="/legal/terms" className="transition hover:text-foreground">
              {d.footer.terms}
            </Link>
            <Link href="/legal/privacy" className="transition hover:text-foreground">
              {d.footer.privacy}
            </Link>
            <FeedbackButton signedIn={Boolean(user)} />
          </div>
        </div>
      </div>
    </footer>
  );
}
