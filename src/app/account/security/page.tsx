import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/account/change-password-form';
import { VerificationPanel } from '@/components/account/verification-panel';
import { getCurrentUser, toPublicUser } from '@/lib/auth/session';
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
      <ChangePasswordForm />
      <VerificationPanel user={toPublicUser(user)} />
    </>
  );
}
