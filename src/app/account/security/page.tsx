import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/account/change-password-form';
import { VerificationPanel } from '@/components/account/verification-panel';
import { getCurrentUser, toPublicUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Security',
};

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
