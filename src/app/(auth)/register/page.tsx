import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthHeader } from '@/components/auth/auth-layout';
import { AuthFormFallback } from '@/components/auth/auth-shell';
import { PhonePinFlow } from '@/components/auth/phone-pin-flow';
import { getCurrentUser } from '@/lib/auth/session';
import { getTranslations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.auth.register.metaTitle, description: d.auth.register.metaDescription };
}

export default async function RegisterPage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (user) redirect('/account');

  return (
    <>
      <AuthHeader title={d.auth.register.title} subtitle={d.auth.register.subtitle} />
      <Suspense fallback={<AuthFormFallback rows={2} />}>
        <PhonePinFlow mode="signup" />
      </Suspense>
    </>
  );
}
