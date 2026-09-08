import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { I18nProvider } from '@/components/i18n-provider';
import { getCurrentUser, toPublicUser } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

/** The product name shown in the header and browser tab; the footer/legal pages
 *  use the registered company name from `publicEnv.brandName` instead. */
const PRODUCT_NAME = 'Eplug';

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_NAME} — цахилгаан машины цэнэглэх сүлжээ`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description:
    'Ойролцоох цэнэглэх станцуудыг хайж, холбогчийн сул байдлыг шууд харж, цэнэглэлтийн бүртгэлээ удирдаарай.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#060b12' },
  ],
};

/**
 * Applied before paint so a stored theme choice does not flash the wrong palette
 * on first load.
 */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('evapp-theme');if(t){document.documentElement.dataset.theme=t}}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <SiteHeader user={user ? toPublicUser(user) : null} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
