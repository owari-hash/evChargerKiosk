import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return {
    title: d.auth.reset.metaTitle,
    description: d.auth.reset.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage() {
  const { d } = await getTranslations();

  return (
    <AuthShell
      title={d.auth.reset.title}
      subtitle={d.auth.reset.subtitle}
      footer={
        <>
          {d.auth.reset.footerPrompt}{' '}
          <Link href="/login" className="font-medium text-brand underline underline-offset-2">
            {d.auth.reset.backToSignIn}
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormFallback rows={4} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
