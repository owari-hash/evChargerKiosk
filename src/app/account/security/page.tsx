import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChangePinForm } from '@/components/account/change-pin-form';
import { VerificationPanel } from '@/components/account/verification-panel';
import { getCurrentUser } from '@/lib/driver-api';
import { getTranslations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.account.nav.security };
}

export default async function AccountSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <>
      <ChangePinForm hasPin={user.hasPin} />
      <VerificationPanel user={user} />
    </>
  );
}
