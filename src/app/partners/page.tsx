import type { Metadata } from 'next';
import Link from 'next/link';
import { PartnersStage } from '@/components/partners/partners-stage';
import { DEFAULT_CONTACT_INFO, getContactInfo } from '@/lib/driver-api';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: `Түншлэл & Partner API — ${brand}`,
    description:
      'Eplug нээлттэй сүлжээний түншүүд: Станцын төлөв харах, алсаас цэнэглэлт эхлүүлэх, зогсоох болон кВтц зарцуулалтыг өөрийн системтэйгээ синк хийх боломж.',
  };
}

export default async function PartnersPage() {
  const [{ d, locale }, contact] = await Promise.all([
    getTranslations(),
    getContactInfo().catch(() => DEFAULT_CONTACT_INFO),
  ]);

  const isEn = locale === 'en';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================================================================== */}
      {/* 1. HERO WITH ANIMATED GLOWING NETWORK STAGE                           */}
      {/* ===================================================================== */}
      <PartnersStage
        title={isEn ? 'Eplug Partner Platform' : 'Eplug Түншлэл & API'}
        subtitle={isEn ? 'Open EV Ecosystem' : 'Цахилгаан машин цэнэглэх сүлжээний нээлттэй экосистем'}
        teaserLead={isEn ? 'Open APIs for partners:' : 'Түншүүдэд зориулсан нээлттэй API боломжууд:'}
        teaserItems={
          isEn
            ? [
                'Live Station Availability',
                'Remote Session Start & Stop',
                'Real-time kWh & Meter Sync',
                'OAuth2 Token Rotation',
                'Automated Monitoring & Logs',
              ]
            : [
                'Станцын шууд төлөв ба бэлэн байдал',
                'Алсаас цэнэглэлт эхлүүлэх ба зогсоох',
                'Бодит цагийн кВтц & тоолуурын синк',
                'OAuth2 Access + Refresh Token Rotation',
                'API хүсэлтийн автомат лог & мониторинг',
              ]
        }
      >
        {/* Prominent API DOCS CTA Button (User requested) */}
        <Link
          href="/docs"
          className="group relative inline-flex items-center gap-2.5 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-brand-contrast shadow-[0_10px_30px_-10px] shadow-brand/60 ring-1 ring-brand-strong transition hover:scale-[1.03] hover:bg-brand-strong active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4.5 transition group-hover:-translate-x-0.5"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="tracking-wide text-base">API DOCS</span>
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-mono font-normal opacity-90">
            eplug.mn/docs
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4 transition group-hover:translate-x-1"
          >
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </Link>

        {/* Secondary Contact Button */}
        <a
          href="#contact"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/80 px-5 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition hover:bg-surface hover:border-brand/40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-muted">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>{isEn ? 'Partner Onboarding' : 'Мерчант эрх авах'}</span>
        </a>
      </PartnersStage>

      {/* ===================================================================== */}
      {/* 2. VALUE PROPOSITION & CAPABILITIES                                   */}
      {/* ===================================================================== */}
      <section className="relative border-t border-border bg-surface/50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              {isEn ? 'Integration Possibilities' : 'Түншлэлийн боломжууд'}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEn
                ? 'Connect your fleet or app directly to Eplug'
                : 'Өөрийн систем, парк болон аппликейшнийг Eplug сүлжээтэй холбоорой'}
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base leading-relaxed">
              {isEn
                ? 'Real-time OCPP status, remote session initiation, automatic token rotation, and comprehensive API logs.'
                : 'Бодит цагийн OCPP холболт, алсаас цэнэглэлт эхлүүлэх болон зогсоох, кВтц тоолуурын хяналт болон токен аюулгүй байдлын дэвшилтэт систем.'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs transition hover:border-brand/40 hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {isEn ? 'Live Station Status' : 'Станцын бодит цагийн төлөв'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'Query station health, connector availability (Available, Charging, Faulted), and maximum power capacity in kilowatts.'
                  : 'Станц тус бүрийн холболтын байдал, холбогч бууны сул эсвэл цэнэглэж буй төлөв, гаралтын чадлыг (кВт) шууд татаж өөрийн системд харуулах.'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs transition hover:border-brand/40 hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {isEn ? 'Remote Charging Control' : 'Алсаас цэнэглэлт удирдах'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'Start and stop charging remotely using OCPP RemoteStartTransaction. Track active session progress and live energy metrics.'
                  : 'Өөрийн сервэр эсвэл Kiosk-оос цэнэглэлтийг алсаас эхлүүлж, зогсоох тушаал өгнө. Нийт цэнэглэсэн кВтц болон үргэлжилсэн хугацааг шууд тооцно.'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs transition hover:border-brand/40 hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {isEn ? 'Enterprise Security' : 'Байгууллагын аюулгүй байдал'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'OAuth2 Bearer tokens with 2h expiry, 30d refresh token rotation, station scoping, and IP address whitelisting.'
                  : 'Access токен (2 цаг) + автомат Refresh токен эргэлт (30 хоног), мерчант тус бүрийн станцын эрхийн тусгаарлалт болон IP Whitelist хамгаалалт.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. DEVELOPER SPOTLIGHT BANNER -> /docs                                */}
      {/* ===================================================================== */}
      <section className="border-t border-border bg-gradient-to-b from-background to-surface py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-12 shadow-xl">
            {/* Background decorative glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand/10 blur-3xl"
            />

            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl space-y-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  <span>3-Column Interactive API Reference</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {isEn ? 'Detailed Developer Documentation' : 'Хөгжүүлэгчийн нарийвчилсан гарын авлага'}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {isEn
                    ? 'Explore complete endpoint schemas, interactive request/response samples, cURL, Node.js, and Python snippets, and download the OpenAPI 3.0 specification.'
                    : 'Mailchimp загварын 3 баганат интерактив гарын авлагаас бүх эндпойнтын бүтэц, cURL, Node.js, Python жишээ код болон OpenAPI стандартыг үзээрэй.'}
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/docs"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3.5 text-sm font-semibold text-background shadow-md transition hover:bg-foreground/90 active:scale-95"
                >
                  <span>{isEn ? 'Open API Docs' : 'API Баримтжуулалт нээх'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </Link>

                <a
                  href="https://eplug.mn/api/partner/docs/openapi.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3.5 text-xs font-medium text-foreground transition hover:bg-border"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-brand">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  <span>OpenAPI JSON</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. CONTACT & ONBOARDING SECTION                                       */}
      {/* ===================================================================== */}
      <section id="contact" className="border-t border-border py-16 bg-surface/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isEn ? 'Get Started' : 'Хамтран ажиллах'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isEn ? 'Request Partner API Credentials' : 'Мерчант эрх авах & Холбогдох'}
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted leading-relaxed">
            {isEn
              ? 'To obtain your merchant username, password, and station access permissions, contact the Eplug administrative team.'
              : 'Та өөрийн байгууллага дээр мерчантын эрх (хэрэглэгчийн нэр, нууц үг, зөвшөөрөгдөх станц) нээлгэх хүсэлтээ Eplug-ийн удирдлагын багт илгээнэ үү.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-medium">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-2 text-foreground hover:text-brand transition"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <span>{contact.phone}</span>
              </a>
            )}

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 text-foreground hover:text-brand transition"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <span>{contact.email}</span>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
