import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, Card, CardBody } from '@/components/ui';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Terms of service (draft)',
  description:
    'Draft terms of service for the charging app. To be replaced by the operator’s own legal text before launch.',
};

const SECTIONS: Array<{ heading: string; body: ReactNode }> = [
  {
    heading: 'About this service',
    body: (
      <>
        <p>
          {publicEnv.brandName} is a website that shows the charge points of a charging network, their
          live availability and their tariffs, and lets a driver keep an account so that charging
          sessions can be listed in one place. The charge points themselves are owned and run by the
          network operator.
        </p>
        <p>
          Using this site does not create a charging contract on its own. What you owe for a charge,
          and to whom, is governed by the arrangement you have with the operator.
        </p>
      </>
    ),
  },
  {
    heading: 'Your account',
    body: (
      <>
        <p>
          You must give a working email address and choose a password of at least eight characters
          containing a letter and a digit. Keep your password to yourself; anyone who has it can see
          your charging history. Tell the operator promptly if you think someone else has access.
        </p>
        <p>
          One account is for one person. You may link the identifiers of charge tags that belong to
          you. Do not link a tag that is not yours: doing so would expose another driver&rsquo;s
          sessions to you and may be treated as misuse.
        </p>
      </>
    ),
  },
  {
    heading: 'Using a charge point',
    body: (
      <>
        <p>
          Follow the instructions displayed on the unit and any site rules where it stands. Do not use
          equipment that appears damaged. Do not attempt to open, modify or interfere with a charge
          point, and do not obstruct a charging bay when you are not charging.
        </p>
        <p>
          You are responsible for your vehicle and its charging equipment, and for whether a
          particular plug and power level are suitable for it.
        </p>
      </>
    ),
  },
  {
    heading: 'Availability and accuracy',
    body: (
      <>
        <p>
          Availability, plug status and tariffs are shown as the charging network last reported them.
          A charge point that has lost contact with the network is marked offline and its plug status
          is not known. Information may be out of date or incomplete, and a charge point may be
          occupied or out of service by the time you arrive.
        </p>
        <p>
          The service is provided as it stands. It may be interrupted for maintenance, and features
          may change or be withdrawn.
        </p>
      </>
    ),
  },
  {
    heading: 'Prices and payment',
    body: (
      <>
        <p>
          Each charge point has its own price per kilowatt-hour, set by the operator, as described on
          the{' '}
          <Link href="/pricing" className="font-medium text-brand hover:underline">
            pricing page
          </Link>
          . This site does not take payments and does not hold card details.
        </p>
      </>
    ),
  },
  {
    heading: 'Acceptable use',
    body: (
      <p>
        Do not attempt to gain access to accounts or systems that are not yours, scrape or overload
        the service, or use it to break the law. Automated access to the site&rsquo;s interfaces is
        rate limited and may be blocked.
      </p>
    ),
  },
  {
    heading: 'Liability',
    body: (
      <p>
        [Placeholder — the operator&rsquo;s own limitation of liability, warranty and indemnity
        wording belongs here, drafted to the law that applies to the operator. Nothing in this draft
        should be relied on as a limitation of liability.]
      </p>
    ),
  },
  {
    heading: 'Ending your access',
    body: (
      <p>
        You may stop using the service at any time. The operator may suspend an account that is being
        used in breach of these terms or in a way that endangers people or equipment.
      </p>
    ),
  },
  {
    heading: 'Changes to these terms',
    body: (
      <p>
        These terms may change. The version published on this page is the one that applies. Where a
        change materially affects you, the operator should tell you before it takes effect.
      </p>
    ),
  },
  {
    heading: 'Governing law and contact',
    body: (
      <p>
        [Placeholder — the operator must state the governing law, the competent courts, the legal
        entity behind the service, its registered address and a contact address for legal notices.]
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="max-w-3xl">
        <Alert tone="warning" title="Draft — not yet legally binding">
          This is placeholder text written to give the app a complete set of pages. It must be
          replaced by the operator&rsquo;s own terms of service, reviewed by a lawyer, before the
          service is opened to the public.
        </Alert>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of service
          </h1>
          <p className="mt-3 text-base text-muted">
            The rules for using the {publicEnv.brandName} website and the charging network it
            describes.
          </p>
        </header>

        <Card className="mt-8">
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
          <Link href="/legal/privacy" className="font-medium text-brand hover:underline">
            privacy notice
          </Link>
          , which explains what this app stores about you.
        </p>
      </div>
    </div>
  );
}
