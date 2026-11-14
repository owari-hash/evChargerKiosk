import type { Metadata } from 'next';
import { DocsView } from './docs-view';
import { publicEnv } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: `Developer API Reference — ${brand}`,
    description:
      'Eplug Partner & Developer API баримтжуулалт: Станцын бэлэн байдал, бодит цагийн төлөв, алсаас цэнэглэлт эхлүүлэх, зогсоох болон сессийн кВтц дата синк хийх хөгжүүлэгчийн гарын авлага.',
    keywords: [
      'Eplug API',
      'EV Charger API',
      'Partner API',
      'OCPP Partner Integration',
      'Цэнэглэгч API',
      'Eplug Developer Platform',
    ],
  };
}

export default function DocsPage() {
  return <DocsView />;
}
