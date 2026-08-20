import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFormFallback, AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Confirm the email address on your charging account.',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Confirm your email"
      subtitle="This only takes a moment — you do not need to do anything else."
    >
      <Suspense fallback={<AuthFormFallback rows={1} />}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
