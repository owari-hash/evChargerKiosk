import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from '@/lib/i18n';

const Email = ({ to }: { to: string }) => (
  <a href={`mailto:${to}`} className="font-semibold text-brand hover:underline">
    {to}
  </a>
);

const COPY = {
  mn: {
    metaTitle: 'Eplug — Бүртгэл устгах',
    metaDescription: 'Eplug бүртгэл болон хувийн мэдээллээ устгуулах заавар',
    title: 'Бүртгэл устгах',
    subtitle: 'Eplug бүртгэл болон түүнтэй холбоотой хувийн мэдээллээ хэрхэн устгуулах вэ',
    appTitle: '1. Аппликейшн дотроос устгах',
    appIntro: 'Утсандаа Eplug апп суулгасан бол тохиргооноосоо шууд устгах боломжтой:',
    appSteps: [
      <>Утсан дээрээ <strong>Eplug</strong> аппыг нээнэ.</>,
      <>Доод цэснээс <strong>Бүртгэл</strong> хэсгийг сонгоно.</>,
      <><strong>Аюулгүй байдал</strong> руу орно.</>,
      <><strong>Бүртгэл устгах</strong> товчийг дарж баталгаажуулна.</>,
    ] as ReactNode[],
    mailTitle: '2. И-мэйлээр хүсэлт гаргах',
    mailIntro:
      'Аппаа устгасан эсвэл нэвтэрч чадахгүй байгаа бол манай хувийн мэдээллийн багт и-мэйл илгээж бүртгэлээ устгуулах хүсэлт гаргана уу:',
    mailBody: (
      <>
        <Email to="privacy@eplug.mn" /> эсвэл <Email to="support@eplug.mn" /> хаяг руу{' '}
        <code>&quot;Бүртгэл устгах хүсэлт&quot;</code> гарчигтай и-мэйл илгээнэ үү.
      </>
    ),
    mailVerify: (
      <>
        Бид таны бүртгэлийг шалгаж устгахын тулд бүртгэлтэй <strong>утасны дугаар</strong> эсвэл{' '}
        <strong>и-мэйл хаягаа</strong> заавал бичнэ үү.
      </>
    ),
    dataTitle: '3. Мэдээлэл хадгалах журам',
    deleted: (
      <>
        <strong>Устгагдах мэдээлэл:</strong> Таны нэр, утас, и-мэйл, холбосон RFID карт, нэвтрэлтийн
        мэдээлэл болон байршлын тохиргоо хүсэлт баталгаажсанаас хойш 30 хоногийн дотор бүрмөсөн устгагдана.
      </>
    ),
    retained: (
      <>
        <strong>Хадгалагдах мэдээлэл:</strong> Өмнөх төлбөрийн гүйлгээ болон НӨАТ-ын баримтыг Монгол Улсын
        нягтлан бодох бүртгэл, татварын хуулийн дагуу хадгална.
      </>
    ),
    back: 'Нууцлалын бодлого руу буцах',
  },
  en: {
    metaTitle: 'Eplug — Account deletion',
    metaDescription: 'How to delete your Eplug account and personal data',
    title: 'Account deletion',
    subtitle: 'How to delete your Eplug account and the personal data linked to it',
    appTitle: '1. Delete in the app',
    appIntro: 'If the Eplug app is on your phone, you can delete your account right away:',
    appSteps: [
      <>Open the <strong>Eplug</strong> app.</>,
      <>Tap <strong>Account</strong> in the bottom bar.</>,
      <>Open <strong>Security</strong>.</>,
      <>Tap <strong>Delete account</strong> and confirm.</>,
    ] as ReactNode[],
    mailTitle: '2. Request by email',
    mailIntro:
      'If you removed the app or can’t sign in, email our privacy team to have your account deleted:',
    mailBody: (
      <>
        Email <Email to="privacy@eplug.mn" /> or <Email to="support@eplug.mn" /> with the subject{' '}
        <code>&quot;Account Deletion Request&quot;</code>.
      </>
    ),
    mailVerify: (
      <>
        Include your registered <strong>phone number</strong> or <strong>email address</strong> so we can
        verify and delete your account.
      </>
    ),
    dataTitle: '3. What we delete and keep',
    deleted: (
      <>
        <strong>Deleted:</strong> your name, phone, email, linked RFID cards, sign-in sessions and location
        preferences — permanently, within 30 days of confirming the request.
      </>
    ),
    retained: (
      <>
        <strong>Kept:</strong> past payments and tax receipts, as Mongolian accounting and tax law requires.
      </>
    ),
    back: 'Back to Privacy Policy',
  },
};

async function copy() {
  const { locale } = await getTranslations();
  return COPY[locale === 'en' ? 'en' : 'mn'];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await copy();
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function DeleteAccountPage() {
  const t = await copy();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t.title}</h1>
        <p className="mt-2 text-sm text-muted">{t.subtitle}</p>
      </header>

      <div className="space-y-8 text-foreground">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold text-brand">{t.appTitle}</h2>
          <p className="mb-3 text-sm text-muted">{t.appIntro}</p>
          <ol className="list-decimal space-y-2 pl-6 text-sm text-muted">
            {t.appSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold text-brand">{t.mailTitle}</h2>
          <p className="mb-4 text-sm text-muted">{t.mailIntro}</p>
          <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            <p>{t.mailBody}</p>
            <p>{t.mailVerify}</p>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-6 text-sm text-muted shadow-sm">
          <h2 className="text-xl font-semibold text-brand">{t.dataTitle}</h2>
          <p>{t.deleted}</p>
          <p>{t.retained}</p>
        </section>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
        <Link href="/legal/privacy" className="font-medium text-brand hover:underline">
          {t.back}
        </Link>
      </footer>
    </div>
  );
}
