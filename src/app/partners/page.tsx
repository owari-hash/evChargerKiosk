import type { Metadata } from 'next';
import { PartnerDocs } from '@/components/partners/partner-docs';
import { DEFAULT_CONTACT_INFO, getContactInfo } from '@/lib/driver-api';
import { publicEnv } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: `Partner API — ${brand}`,
    description: 'Eplug Partner API: жолоочийн мэдээлэл, хэтэвчний үлдэгдэл, станцын төлөвийг синк хийх заавар.',
  };
}

export default async function PartnersPage() {
  const contact = await getContactInfo().catch(() => DEFAULT_CONTACT_INFO);
  return <PartnerDocs contact={{ phone: contact.phone, email: contact.email }} />;
}
