import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password using your reset link or the code we texted you.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you have not used here before."
      footer={
        <>
          Changed your mind?{' '}
          <Link href="/login" className="font-medium text-brand underline underline-offset-2">
            Back to sign in
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
