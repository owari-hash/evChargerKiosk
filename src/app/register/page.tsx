import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a charging account to start sessions and keep your receipts in one place.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute, and you can charge straight afterwards."
      footer={
        <>
          Questions first?{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            Read the help pages
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
