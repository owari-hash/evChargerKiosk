import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.auth.forgot.metaTitle, description: d.auth.forgot.metaDescription };
}

export default async function ForgotPasswordPage() {
  const { d } = await getTranslations();

  return (
    <AuthShell
      title={d.auth.forgot.title}
      subtitle={d.auth.forgot.subtitle}
      footer={
        <>
          {d.auth.forgot.footerPrompt}{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            {d.auth.login.getHelp}
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
