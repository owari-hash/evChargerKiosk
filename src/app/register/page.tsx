import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.auth.register.metaTitle, description: d.auth.register.metaDescription };
}

export default async function RegisterPage() {
  const { d } = await getTranslations();

  return (
    <AuthShell
      title={d.auth.register.title}
      subtitle={d.auth.register.subtitle}
      footer={
        <>
          {d.auth.register.footerPrompt}{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            {d.auth.register.readHelp}
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormFallback rows={5} />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
