import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return {
    title: d.auth.verify.metaTitle,
    description: d.auth.verify.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage() {
  const { d } = await getTranslations();

  return (
    <AuthShell title={d.auth.verify.title} subtitle={d.auth.verify.subtitle}>
      <Suspense fallback={<AuthFormFallback rows={1} />}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
