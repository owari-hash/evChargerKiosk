import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Send yourself a reset link by email or a 6-digit code by SMS.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Tell us how to reach you and we will send the next step."
      footer={
        <>
          Still stuck?{' '}
          <Link href="/help" className="font-medium text-brand underline underline-offset-2">
            Get help
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
