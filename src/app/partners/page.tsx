import type { Metadata } from 'next';
import Link from 'next/link';
import { PartnersStage } from '@/components/partners/partners-stage';
import { DEFAULT_CONTACT_INFO, getContactInfo } from '@/lib/driver-api';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: `Түншүүд & API — ${brand}`,
    description:
      'Eplug цахилгаан машин цэнэглэх сүлжээний түншлэлийн платформ: Станцын төлөв шалгах, цэнэглэлт удирдах нээлттэй API.',
  };
}

export default async function PartnersPage() {
  const [{ locale }, contact] = await Promise.all([
    getTranslations(),
    getContactInfo().catch(() => DEFAULT_CONTACT_INFO),
  ]);

  const isEn = locale === 'en';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ===================================================================== */}
      {/* 1. HERO SECTION WITH ANIMATED NETWORK CANVAS BACKGROUND               */}
      {/* ===================================================================== */}
      <PartnersStage
        title={
          isEn
            ? 'Open EV Charging Network & API'
            : 'Цахилгаан машин цэнэглэх дэд бүтцийг системтэйгээ холбох нээлттэй API'
        }
        subtitle={
          isEn
            ? 'Connect your fleet, mobile application, or management software directly to Eplug chargers. Check live connector availability and remotely control charging sessions.'
            : 'Өөрийн байгууллагын авто парк, мобайл аппликейшн болон киоск системийг Eplug цэнэглэгчтэй шууд холбож, станцын бэлэн байдлыг шалгах, цэнэглэлтийг удирдах боломжтой.'
        }
      >
        <Link
          href="/docs"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-7 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-strong active:scale-[0.98]"
        >
          <span>API DOC</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </Link>

        <a
          href="#contact"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 text-sm font-semibold text-foreground transition hover:bg-surface-muted active:scale-[0.98]"
        >
          {isEn ? 'Contact Us' : 'Холбоо барих'}
        </a>
      </PartnersStage>

      {/* ===================================================================== */}
      {/* 2. CORE CAPABILITIES (3 Clean Cards)                                  */}
      {/* ===================================================================== */}
      <section className="border-b border-border bg-surface/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEn ? 'Core Capabilities' : 'Түншүүдэд олгох боломжууд'}
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base leading-relaxed">
              {isEn
                ? 'Everything you need to integrate and operate EV charging workflows.'
                : 'Цэнэглэлтийн үйл ажиллагааг өөрийн системтэй найдвартай уялдуулах боломжууд.'}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">
                {isEn ? 'Live Station Status' : 'Станцын бэлэн байдал'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'Access real-time charger online status, connector types (GBT, CCS2), availability, and max kW power output.'
                  : 'Цэнэглэх станцын онлайн төлөв, бууны бэлэн байдал (сул, цэнэглэж буй), холбогчийн төрөл болон гаралтын чадлыг (кВт) бодит цагт харах.'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">
                {isEn ? 'Remote Session Control' : 'Цэнэглэлтийг алсаас удирдах'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'Start and stop charging remotely, track ongoing session elapsed minutes, and calculate consumed kWh energy.'
                  : 'Өөрийн систем эсвэл киоскоос цэнэглэлт эхлүүлэх, зогсоох тушаал өгөх, нийт зарцуулсан цахилгааны хэмжээ (кВтц)-г шууд тооцоолох.'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">
                {isEn ? 'Security & Permissions' : 'Аюулгүй хандалт'}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {isEn
                  ? 'OAuth2 Bearer tokens with refresh rotation, station access whitelisting, and IP restriction support.'
                  : 'Bearer токен, автоматаар эргэлдэх Refresh токен, IP хаягийн хамгаалалт болон мерчант бүрийн хандах станцын эрхийн тохиргоо.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. DEVELOPER DOCUMENTATION STRIP                                      */}
      {/* ===================================================================== */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                {isEn ? 'Developer Reference' : 'Хөгжүүлэгчийн гарын авлага'}
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {isEn ? 'Complete API Documentation' : 'Систем интеграцийн баримтжуулалт'}
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {isEn
                  ? 'Explore all REST endpoints, query parameters, request schemas, status codes, and code examples in cURL, Node.js, and Python.'
                  : 'Бүх эндпойнтын бүтэц, параметрүүд, хүсэлт хариултын загвар, алдааны кодууд болон cURL, Node.js, Python жишээ кодуудыг харах.'}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/docs"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-brand-strong active:scale-[0.98]"
              >
                API DOC
              </Link>

              <a
                href="https://eplug.mn/api/partner/docs/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface-muted px-4 text-xs font-semibold text-foreground transition hover:bg-border active:scale-[0.98]"
              >
                OpenAPI Spec
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. CONTACT / ONBOARDING                                               */}
      {/* ===================================================================== */}
      <section id="contact" className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isEn ? 'Get Started as a Partner' : 'Хамтран ажиллах хүсэлт илгээх'}
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-xl mx-auto">
            {isEn
              ? 'To request partner merchant credentials, configure station permissions, or discuss custom integration, contact our team.'
              : 'Eplug сүлжээнд станцаа холбох эсвэл мерчантын хандалтын эрх (нэвтрэх нэр, нууц үг) авах бол манай багтай холбогдоно уу.'}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-2 text-foreground hover:text-brand transition"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
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
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
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
