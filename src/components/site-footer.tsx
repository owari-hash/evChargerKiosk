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
    <footer className="mt-auto border-t border-emerald-950/20 bg-[#084742] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-12">
          {/* Column 1: Brand & Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-white">{brandName}</h3>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
              <Image
                src="/eplug-mark.png"
                alt={brandName}
                width={48}
                height={48}
                className="size-full rounded-xl object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={logoUrl}
                download="eplug-logo.png"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
              >
                <span>Лого татах</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <path d="M12 5v14m0 0l-5-5m5 5l5-5" />
                </svg>
              </a>

              <FooterLocaleButton locale={locale} />
            </div>
          </div>

          {/* Column 2: Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-white/70">
              {locale === 'en' ? 'Social links' : 'Сошиал хаяг'}
            </h3>
            <div className="space-y-4">
              {/* Facebook */}
              {contact.facebookUrl ? (
                <a
                  href={contact.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-90"
                >
                  <div>
                    <p className="text-[11px] font-medium text-white/60">Facebook</p>
                    <p className="text-sm font-semibold text-white/95 group-hover:underline">
                      {contact.facebookName || 'Eplug.mn'}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition group-hover:bg-white/20">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
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
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-90"
                >
                  <div>
                    <p className="text-[11px] font-medium text-white/60">Instagram</p>
                    <p className="text-sm font-semibold text-white/95 group-hover:underline">
                      {contact.instagramName || 'Eplug.mn'}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition group-hover:bg-white/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
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
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-white/70">
              {locale === 'en' ? 'Contact us' : 'Холбоо барих'}
            </h3>
            <div className="space-y-4">
              {/* Phone */}
              {contact.phone ? (
                <a
                  href={primaryPhone ? `tel:${primaryPhone}` : undefined}
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-90"
                >
                  <div>
                    <p className="text-[11px] font-medium text-white/60">
                      {locale === 'en' ? 'Phone' : 'Утас'}
                    </p>
                    <p className="text-sm font-semibold text-white/95 group-hover:underline">
                      {contact.phone}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition group-hover:bg-white/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
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
                  className="group flex items-center justify-between gap-3 text-left transition hover:opacity-90"
                >
                  <div>
                    <p className="text-[11px] font-medium text-white/60">
                      {locale === 'en' ? 'Email' : 'И-мэйл'}
                    </p>
                    <p className="text-sm font-semibold text-white/95 group-hover:underline">
                      {contact.email}
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition group-hover:bg-white/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
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
      <div className="border-t border-white/10 bg-black/10 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-white/70 sm:flex-row sm:px-6">
          <p className="text-center sm:text-left">
            {format(d.footer.rights, {
              year: new Date().getFullYear(),
              brand: brandName,
            })}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/legal/terms" className="transition hover:text-white">
              {d.footer.terms}
            </Link>
            <Link href="/legal/privacy" className="transition hover:text-white">
              {d.footer.privacy}
            </Link>
            <FeedbackButton signedIn={Boolean(user)} />
          </div>
        </div>
      </div>
    </footer>
  );
}
