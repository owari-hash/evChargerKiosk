import type { Metadata } from 'next';
import { PartnersStage } from '@/components/partners/partners-stage';
import { publicEnv } from '@/lib/env';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  const brand = publicEnv.brandName || 'Eplug';
  return { title: `${d.nav.partners} — ${brand}` };
}

export default async function PartnersPage() {
  const { d, locale } = await getTranslations();
  const isEn = locale === 'en';

  return (
    <PartnersStage
      title={d.nav.partners}
      subtitle={isEn ? 'Coming soon' : 'Тун удахгүй'}
      teaserLead={isEn ? 'Open APIs for partners:' : 'Түншүүдэд зориулсан нээлттэй API:'}
      teaserItems={
        isEn
          ? ['Customer data', 'Wallet', 'Transactions', 'Charging sessions', 'Stations & pricing']
          : ['Хэрэглэгчийн мэдээлэл', 'Хэтэвч', 'Гүйлгээ', 'Цэнэглэлт', 'Станц ба тариф']
      }
    />
  );
}
