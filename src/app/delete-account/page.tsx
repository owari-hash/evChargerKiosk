import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'E-Plug - Account Deletion / Данс Устгах',
  description: 'Request account deletion and personal data removal for E-Plug EV Application',
};

export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          E-Plug — Account Deletion / Данс Устгах
        </h1>
        <p className="mt-2 text-sm text-muted">
          How to delete your E-Plug account and associated personal data / Данс болон хувийн мэдээллээ устгуулах заавар
        </p>
      </header>

      <div className="space-y-8 text-foreground">
        {/* Section 1: In-App Deletion */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-brand mb-3">
            1. In-App Deletion / Апп дотроос устгах
          </h2>
          <p className="text-sm text-muted mb-3">
            If you have the E-Plug app installed on your phone, you can delete your account immediately from your settings:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm text-muted">
            <li>Open the <strong>E-Plug App</strong> on your mobile device.</li>
            <li>Tap on <strong>Account (Данс)</strong> in the bottom navigation.</li>
            <li>Select <strong>Security (Аюулгүй байдал)</strong>.</li>
            <li>Tap <strong>Delete Account & Data (Акаунт устгах)</strong> and confirm.</li>
          </ul>
        </section>

        {/* Section 2: Online / Web Deletion Request */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-brand mb-3">
            2. Web & Email Request / Веб болон и-мэйлээр хүсэлт гаргах
          </h2>
          <p className="text-sm text-muted mb-4">
            If you have uninstalled the app or cannot sign in, you can request account deletion by emailing our Data Privacy team or submitting your registered contact details:
          </p>
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted space-y-3">
            <p>
              <strong>Direct Email Request:</strong> Send an email to{' '}
              <a href="mailto:privacy@eplug.mn" className="font-semibold text-brand hover:underline">
                privacy@eplug.mn
              </a>{' '}
              or{' '}
              <a href="mailto:support@eplug.mn" className="font-semibold text-brand hover:underline">
                support@eplug.mn
              </a>{' '}
              with the subject <code>&quot;Account Deletion Request&quot;</code>.
            </p>
            <p>
              Please include your registered <strong>Email Address</strong> or <strong>Phone Number</strong> so we can verify and delete your account.
            </p>
          </div>
        </section>

        {/* Section 3: Data Policy */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3 text-sm text-muted">
          <h2 className="text-xl font-semibold text-brand">
            3. Data Retention Policy / Мэдээлэл хадгалах журам
          </h2>
          <p>
            <strong>Data Deleted:</strong> Your profile details (Name, Email, Phone), linked RFID Charge Tags, stored session tokens, and location preferences will be permanently deleted within 30 days of request confirmation.
          </p>
          <p>
            <strong>Data Retained:</strong> Past financial transactions and tax invoice records are retained in compliance with statutory Mongolian accounting and tax legislation.
          </p>
        </section>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
        Back to{' '}
        <Link href="/legal/privacy" className="font-medium text-brand hover:underline">
          Privacy Policy
        </Link>{' '}
        | E-Plug EV Charging Platform
      </footer>
    </div>
  );
}
