import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your charging account to start sessions and see your history.',
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Reach your charging account, sessions and receipts."
      footer={
        <>
          Trouble signing in?{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            Get help
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
