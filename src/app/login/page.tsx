import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
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
    <AuthShell
      title={d.auth.login.title}
      subtitle={d.auth.login.subtitle}
      footer={
        <>
          {d.auth.login.footerPrompt}{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            {d.auth.login.getHelp}
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormFallback rows={2} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
