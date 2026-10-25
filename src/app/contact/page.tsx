import type { Metadata } from 'next';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getContactInfo, DEFAULT_CONTACT_INFO, getCurrentUser } from '@/lib/driver-api';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';
import { FeedbackForm } from '@/components/feedback-button';

export async function generateMetadata(): Promise<Metadata> {
  const { d, locale } = await getTranslations();
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: locale === 'en' ? `Contact — ${brand}` : `Холбоо барих — ${brand}`,
    description: locale === 'en' ? `Get in touch with ${brand}` : `${brand} компанитай холбогдох`,
  };
}

export default async function ContactPage() {
  const [{ d, locale }, user, contact] = await Promise.all([
    getTranslations(),
    getCurrentUser().catch(() => null),
    getContactInfo().catch(() => DEFAULT_CONTACT_INFO),
  ]);

  const isEn = locale === 'en';
  const primaryPhone = contact.phone ? contact.phone.split(',')[0].trim().replace(/\s+/g, '') : '';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:pb-20 sm:pt-10">
      <h1 className="sr-only">{isEn ? 'Contact Us' : 'Холбоо барих'}</h1>

      {/* Main cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Phone Card */}
        <Card className="flex flex-col justify-between transition-shadow hover:shadow-md">
          <CardHeader className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
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
            <CardTitle>{isEn ? 'Phone' : 'Утас'}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              {isEn
                ? 'Call us directly for urgent charging support.'
                : 'Цэнэглэгч ашиглах, төлбөр тооцоотой холбоотой шуурхай тусламж авах.'}
            </p>
            <div className="pt-2">
              <a
                href={primaryPhone ? `tel:${primaryPhone}` : undefined}
                className="text-base font-semibold text-brand hover:underline"
              >
                {contact.phone || '+976 7777 4242, 8888 5516'}
              </a>
            </div>
          </CardBody>
        </Card>

        {/* Email Card */}
        <Card className="flex flex-col justify-between transition-shadow hover:shadow-md">
          <CardHeader className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
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
            <CardTitle>{isEn ? 'Email' : 'И-мэйл'}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              {isEn
                ? 'Send us an email for general questions and business inquiries.'
                : 'Албан хүсэлт, хамтын ажиллагааны саналаа бидэнд и-мэйлээр илгээнэ үү.'}
            </p>
            <div className="pt-2">
              <a
                href={`mailto:${contact.email || 'contact@eplug.mn'}`}
                className="text-base font-semibold text-brand hover:underline"
              >
                {contact.email || 'contact@eplug.mn'}
              </a>
            </div>
          </CardBody>
        </Card>

        {/* Address Card */}
        <Card className="flex flex-col justify-between transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <CardTitle>{isEn ? 'Address' : 'Хаяг / Байршил'}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              {isEn
                ? 'Visit our central office during standard business hours.'
                : 'Компанийн төв байр болон оффисын хаяг.'}
            </p>
            <div className="pt-2">
              <p className="text-base font-medium text-foreground">
                {contact.address || 'Улаанбаатар хот'}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Social and Feedback section */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Social media card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEn ? 'Social Channels' : 'Сошиал хуудсууд'}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {contact.facebookUrl ? (
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border p-3.5 transition hover:bg-surface-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Facebook</p>
                    <p className="text-sm font-semibold text-foreground">
                      {contact.facebookName || 'Eplug.mn'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-brand">Нээх →</span>
              </a>
            ) : null}

            {contact.instagramUrl ? (
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border p-3.5 transition hover:bg-surface-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white">
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
                  <div>
                    <p className="text-xs text-muted">Instagram</p>
                    <p className="text-sm font-semibold text-foreground">
                      {contact.instagramName || 'Eplug.mn'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-brand">Нээх →</span>
              </a>
            ) : null}
          </CardBody>
        </Card>

        {/* Feedback / Inquiry Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEn ? 'Feedback & Inquiries' : 'Санал хүсэлт илгээх'}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-muted">
              {isEn
                ? 'We value your experience and thoughts. Let us know how we can make EV charging smoother for you.'
                : 'Танд үйлчилгээтэй холбоотой санал хүсэлт, сайжруулах санаа байвал бидэнд шууд илгээгээрэй.'}
            </p>
            {/* The form itself, right here — no extra click to open it. */}
            <div className="pt-2">
              <FeedbackForm signedIn={Boolean(user)} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
