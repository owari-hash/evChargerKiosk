import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { buttonClass } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

type L = { mn: string; en: string };

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getTranslations();
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: locale === 'en' ? `Payment methods — ${brand}` : `Төлбөрийн нөхцөл — ${brand}`,
    description:
      locale === 'en'
        ? 'How paying for charging works: wallet top-up methods, fees, receipts and refunds.'
        : 'Цэнэглэлтийн төлбөр хэрхэн тооцогддог: хэтэвч цэнэглэх арга, шимтгэл, баримт, буцаалт.',
  };
}

const METHODS: { logo?: string; icon?: ReactNode; name: L; body: L }[] = [
  {
    logo: '/qpay.svg',
    name: { mn: 'QPay', en: 'QPay' },
    body: {
      mn: 'QR кодыг дурын банкны апп-аар уншуулж төлнө. Бүх банкны апп дэмжинэ.',
      en: 'Scan the QR code with any banking app. Works with every bank.',
    },
  },
  {
    logo: '/social pay.png',
    name: { mn: 'SocialPay', en: 'SocialPay' },
    body: {
      mn: 'Голомт банкны SocialPay апп-аар шууд төлнө.',
      en: 'Pay straight from Golomt Bank’s SocialPay app.',
    },
  },
  {
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M6.5 15h3" strokeLinecap="round" />
      </svg>
    ),
    name: { mn: 'Банкны карт', en: 'Bank card' },
    body: {
      mn: 'Visa, Mastercard, UnionPay. Картын мэдээллийг Голомт банкны аюулгүй хуудсанд оруулна. Картаа хадгалж дараа нь нэг товшилтоор цэнэглэж болно.',
      en: 'Visa, Mastercard, UnionPay. Card details go into Golomt Bank’s secure page. Save the card to top up with one tap next time.',
    },
  },
  {
    logo: '/toki.png',
    name: { mn: 'Toki', en: 'Toki' },
    body: {
      mn: 'Toki апп-аар эсвэл утасны дугаараа оруулж төлнө.',
      en: 'Pay in the Toki app, or by entering your phone number.',
    },
  },
];

const STEPS: { title: L; body: L }[] = [
  {
    title: { mn: 'Хэтэвчээ цэнэглэнэ', en: 'Top up your wallet' },
    body: {
      mn: 'Доорх аргуудын аль нэгээр Eplug хэтэвчээ цэнэглэнэ.',
      en: 'Add money to your Eplug wallet with any method below.',
    },
  },
  {
    title: { mn: 'Цэнэглэнэ', en: 'Charge' },
    body: {
      mn: 'Хэтэвчинд хамгийн багадаа 1,000₮ байхад цэнэглэлт эхлүүлж болно.',
      en: 'You can start charging once the wallet holds at least ₮1,000.',
    },
  },
  {
    title: { mn: 'Дуусахад суутгагдана', en: 'Paid when you finish' },
    body: {
      mn: 'Цэнэглэлт дуусахад зөвхөн авсан кВт·ц-ынхаа төлбөрийг хэтэвчнээс суутгана.',
      en: 'When charging ends, only the kWh you took is taken from the wallet.',
    },
  },
];

const FEES: { what: L; cost: L; note?: L }[] = [
  {
    what: { mn: 'Хэтэвч цэнэглэх', en: 'Wallet top-up' },
    cost: { mn: 'Шимтгэлгүй', en: 'Free' },
    note: { mn: 'Төлсөн дүн тань бүтнээрээ хэтэвчинд орно.', en: 'The full amount you pay lands in your wallet.' },
  },
  {
    what: { mn: 'Цэнэглэлт', en: 'Charging' },
    cost: { mn: 'кВт·ц тутам', en: 'Per kWh' },
    note: {
      mn: 'Үнэ станц бүрийн хуудсанд харагдана. Үйлчилгээний шимтгэл үнэд нь багтсан.',
      en: 'Each station shows its price. The service fee is already included.',
    },
  },
  {
    what: { mn: 'Эхлээгүй цэнэглэлт', en: 'Charge that never started' },
    cost: { mn: '0₮', en: '₮0' },
    note: { mn: 'Цэнэглэлт эхлээгүй бол юу ч суутгагдахгүй.', en: 'Nothing is taken if charging never starts.' },
  },
];

const FAQ: { q: L; a: L }[] = [
  {
    q: { mn: 'Баримт (e-barimt) яаж авах вэ?', en: 'How do I get an e-barimt receipt?' },
    a: {
      mn: 'Цэнэглэлт бүрийн дараа e-barimt автоматаар гарна. Хувь хүн эсвэл байгууллагын нэрээр авч болно. «Миний бүртгэл → e-barimt» хэсгээс бүх баримтаа харна.',
      en: 'An e-barimt is issued after every session, for a person or a company. Find them all under My account → e-barimt.',
    },
  },
  {
    q: { mn: 'Мөнгө буцаалгах бол?', en: 'How do I get a refund?' },
    a: {
      mn: 'Алдаатай гүйлгээ гарсан бол бидэнтэй холбогдоно уу. Шалгаад төлсөн арга руу тань эсвэл хэтэвчинд буцаана.',
      en: 'If a payment went wrong, contact us. We check it and refund to your payment method or wallet.',
    },
  },
  {
    q: { mn: 'Картын мэдээлэл аюулгүй юу?', en: 'Is my card safe?' },
    a: {
      mn: 'Картын дугаарыг Eplug хадгалдаггүй. Та картаа Голомт банкны хуудсанд оруулдаг бөгөөд хадгалсан карт нь банкны нууцлагдсан токеноор ажилладаг.',
      en: 'Eplug never stores your card number. You enter it on Golomt Bank’s page, and a saved card works through the bank’s secure token.',
    },
  },
  {
    q: { mn: 'Хэтэвчний үлдэгдэл дуусвал?', en: 'What if my wallet runs out mid-charge?' },
    a: {
      mn: 'Үлдэгдлээсээ илүү суутгагдахгүй. Цэнэглэлт дуусмагц хэтэвчээ дахин цэнэглээрэй.',
      en: 'You are never charged more than your balance. Top up again before your next session.',
    },
  },
];

export default async function PaymentsPage() {
  const { locale } = await getTranslations();
  const en = locale === 'en';
  const t = (v: L) => (en ? v.en : v.mn);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {en ? 'Payment methods' : 'Төлбөрийн нөхцөл'}
        </h1>
        <p className="mt-3 text-pretty text-muted">
          {en
            ? 'You pay for charging from your Eplug wallet. Here is how to top it up, what it costs, and how receipts and refunds work.'
            : 'Цэнэглэлтийн төлбөрийг Eplug хэтэвчнээсээ төлнө. Хэтэвчээ хэрхэн цэнэглэх, ямар зардалтай, баримт болон буцаалт хэрхэн явагддагийг доор тайлбарлав.'}
        </p>
      </header>

      <section aria-labelledby="how" className="mt-10">
        <h2 id="how" className="text-lg font-semibold text-foreground">
          {en ? 'How it works' : 'Хэрхэн ажилладаг вэ'}
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title.en} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-brand-contrast">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-foreground">{t(step.title)}</h3>
              <p className="mt-1 text-sm text-muted">{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="methods" className="mt-12">
        <h2 id="methods" className="text-lg font-semibold text-foreground">
          {en ? 'Ways to top up' : 'Хэтэвч цэнэглэх аргууд'}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <li key={m.name.en}>
              <Card className="flex h-full items-start gap-4 p-4">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-brand ring-1 ring-border">
                  {m.logo ? (
                    <Image src={m.logo} alt="" width={40} height={40} className="size-9 object-contain" />
                  ) : (
                    m.icon
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{t(m.name)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(m.body)}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fees" className="mt-12">
        <h2 id="fees" className="text-lg font-semibold text-foreground">
          {en ? 'Fees' : 'Шимтгэл, зардал'}
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{en ? 'What' : 'Юу'}</th>
                <th scope="col" className="px-4 py-3 font-medium">{en ? 'Cost' : 'Үнэ'}</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">{en ? 'Details' : 'Тайлбар'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {FEES.map((f) => (
                <tr key={f.what.en}>
                  <th scope="row" className="px-4 py-3 font-medium text-foreground">
                    {t(f.what)}
                    {f.note && <span className="mt-0.5 block text-xs font-normal text-muted sm:hidden">{t(f.note)}</span>}
                  </th>
                  <td className="px-4 py-3 font-semibold text-brand">{t(f.cost)}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{f.note ? t(f.note) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-12">
        <h2 id="faq" className="text-lg font-semibold text-foreground">
          {en ? 'Receipts, refunds and safety' : 'Баримт, буцаалт, аюулгүй байдал'}
        </h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q.en} className="group rounded-2xl bg-surface p-4 ring-1 ring-border open:ring-brand/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground">
                {t(item.q)}
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-muted transition group-open:rotate-180">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-muted">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/account/wallet" className={buttonClass('primary', 'md')}>
          {en ? 'Top up my wallet' : 'Хэтэвч цэнэглэх'}
        </Link>
        <Link href="/contact" className={buttonClass('secondary', 'md')}>
          {en ? 'Questions? Contact us' : 'Асуулт байна уу? Холбогдох'}
        </Link>
      </div>
    </div>
  );
}
