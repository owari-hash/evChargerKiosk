import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthHeader } from '@/components/auth/auth-layout';
import { AuthFormFallback } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/lib/auth/session';
import { getTranslations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.auth.login.metaTitle, description: d.auth.login.metaDescription };
}

export default async function LoginPage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (user) redirect('/account');

  return (
    <>
      <AuthHeader title={d.auth.login.title} subtitle={d.auth.login.subtitle} />
      <Suspense fallback={<AuthFormFallback rows={2} />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
