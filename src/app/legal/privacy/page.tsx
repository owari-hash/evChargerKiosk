import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Privacy notice (draft)',
  description:
    'Draft privacy notice listing exactly what this charging app stores about a driver. To be replaced by the operator’s own text before launch.',
};

interface Row {
  item: string;
  detail: ReactNode;
}

/** Kept deliberately literal: every row below corresponds to a stored field. */
const STORED: Row[] = [
  {
    item: 'Name',
    detail: 'What you typed when you created the account. Used to address you in the interface.',
  },
  {
    item: 'Email address',
    detail:
      'Your sign-in identifier, and where password reset links and verification links are sent. Stored in lower case.',
  },
  {
    item: 'Phone number (optional)',
    detail:
      'Only if you provide one. Stored in international format so it can be matched reliably, and used to send a six-digit code when you verify the number or reset your password by SMS.',
  },
  {
    item: 'Password hash',
    detail:
      'Your password is never stored. What is kept is a bcrypt hash of it, from which the password cannot be recovered.',
  },
  {
    item: 'Linked charge tag identifiers',
    detail:
      'The identifiers of the RFID cards or fobs you have linked to the account. They are what lets the app find the charging sessions that belong to you.',
  },
  {
    item: 'Account state',
    detail:
      'Whether your email and phone have been verified, your language preference, whether the account is active, when it was created and when you last signed in.',
  },
  {
    item: 'Verification and reset tokens',
    detail:
      'While a reset link or a one-time code is outstanding we store a hash of it, the address it was sent to, its expiry time and how many times it has been tried. The token itself is not kept.',
  },
  {
    item: 'Charging session records',
    detail:
      'Start and stop time, charge point, connector, charge tag, energy delivered and cost. These are held by the charging network, not by this app: they are fetched for your linked tags when you open your history and are not copied into this app’s database.',
  },
];

const SECTIONS: Array<{ heading: string; body: ReactNode }> = [
  {
    heading: 'Why this information is held',
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>To let you sign in and to keep your account secure.</li>
        <li>To send the emails and text messages that the sign-up and reset flows require.</li>
        <li>To show you the charging sessions recorded against the charge tags you have linked.</li>
        <li>To rate limit sign-in and reset attempts so accounts cannot be attacked in bulk.</li>
      </ul>
    ),
  },
  {
    heading: 'Where it is stored',
    body: (
      <>
        <p>
          Driver accounts live in the operator&rsquo;s MongoDB database, in collections of their own,
          separate from the operator&rsquo;s own staff accounts. In development the app can fall back
          to a JSON file on the developer&rsquo;s machine instead; that fallback is disabled in
          production.
        </p>
        <p>
          Charging records live in the charging network&rsquo;s own database. This app reads them over
          a server-to-server connection; your browser never talks to the charging network directly.
        </p>
      </>
    ),
  },
  {
    heading: 'Cookies',
    body: (
      <>
        <p>
          Two cookies are used. A session cookie is set only after you sign in: it holds a signed
          token, is marked HttpOnly so page scripts cannot read it, is restricted to same-site
          navigation, and is sent only over HTTPS in production. A second cookie records your
          language choice; it holds nothing but the language code and is readable by the page.
        </p>
        <p>
          There are no advertising or analytics cookies on this site. Map tiles are loaded from a
          third-party tile server, which will see your IP address.
        </p>
      </>
    ),
  },
  {
    heading: 'Who it is shared with',
    body: (
      <>
        <p>
          Your charge tag identifiers are sent to the charging network in order to look up your
          sessions. Your email address is passed to the mail server the operator has configured, and
          your phone number to the SMS gateway, purely to deliver the messages you have asked for.
        </p>
        <p>
          Nothing is sold, and nothing is shared for advertising. [Placeholder — the operator must
          name the actual mail and SMS providers used, and any hosting provider, before launch.]
        </p>
      </>
    ),
  },
  {
    heading: 'How long it is kept',
    body: (
      <p>
        Account information is kept while the account exists. Reset links expire after 30 minutes,
        SMS codes after 10 minutes, and email verification links after 24 hours; expired tokens are
        no longer usable. [Placeholder — the operator must state its own retention period for closed
        accounts and for charging records.]
      </p>
    ),
  },
  {
    heading: 'Your choices',
    body: (
      <>
        <p>
          You can change your name, phone number and language, and add or remove charge tags, from{' '}
          <Link href="/account" className="font-medium text-brand hover:underline">
            My account
          </Link>
          . Removing a tag stops its sessions being shown to you; it does not delete the
          network&rsquo;s record of them.
        </p>
        <p>
          Closing an account is not yet self-service in this app — contact the operator to have it
          done. [Placeholder — the operator must set out the access, correction, deletion and
          complaint rights that apply in its jurisdiction, and who to contact to exercise them.]
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="max-w-3xl">
        <Alert tone="warning" title="Draft — not yet a legal notice">
          This is placeholder text written so the app has a complete set of pages. It describes
          accurately what the software stores, but it must be replaced by the operator&rsquo;s own
          privacy notice, reviewed by a lawyer, before the service is opened to the public.
        </Alert>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy notice
          </h1>
          <p className="mt-3 text-base text-muted">
            What {publicEnv.brandName} stores about you, why, and what you can do about it.
          </p>
        </header>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What is stored</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="divide-y divide-border">
              {STORED.map((row) => (
                <div key={row.item} className="py-4 first:pt-0 last:pb-0">
                  <dt className="text-sm font-semibold text-foreground">{row.item}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted">{row.detail}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card className="mt-6">
          <CardBody className="space-y-8 py-6">
            {SECTIONS.map((section, index) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {index + 1}. {section.heading}
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted">{section.body}</div>
              </section>
            ))}
          </CardBody>
        </Card>

        <p className="mt-6 text-sm text-muted">
          See also the{' '}
          <Link href="/legal/terms" className="font-medium text-brand hover:underline">
            terms of service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
