import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Help',
  description:
    'Answers to the common questions about finding a charger, plug types, charge tags, passwords and offline stations.',
};

interface Entry {
  term: string;
  answer: ReactNode;
}

const FAQ: Entry[] = [
  {
    term: 'How do I find a charger?',
    answer: (
      <>
        Open{' '}
        <Link href="/stations" className="font-medium text-brand hover:underline">
          Find a charger
        </Link>
        . You get every charge point on the network with its live plug status. Search by name or
        address, or filter by plug type, minimum power and whether a plug is free right now. If you
        allow the browser to share your location, the list is sorted by distance and each station
        shows how far away it is. Opening a station gives you its address, tariff, each individual
        plug and a link to directions.
      </>
    ),
  },
  {
    term: 'What does the status on a station mean?',
    answer: (
      <>
        <strong className="font-medium text-foreground">Available now</strong> means at least one
        plug is free and working.{' '}
        <strong className="font-medium text-foreground">All plugs in use</strong> means the charge
        point is online but every plug is occupied, reserved or out of order.{' '}
        <strong className="font-medium text-foreground">Offline</strong> means the charge point is
        not currently talking to the network — see below. Individual plugs also report their own
        state, such as Preparing, Charging or Out of order.
      </>
    ),
  },
  {
    term: 'What is a charge tag, and why should I link one?',
    answer: (
      <>
        A charge tag is the RFID card or fob you hold against the reader to authorise a charge. Every
        tag has an identifier that the charging network records against each session. Add that
        identifier under{' '}
        <Link href="/account" className="font-medium text-brand hover:underline">
          My account
        </Link>{' '}
        and your charging history appears here — energy delivered, duration and cost per session. You
        can link more than one tag, and remove one at any time. Linking a tag does not change who is
        billed; it only lets this app show you the sessions that belong to it.
      </>
    ),
  },
  {
    term: 'How do I reset my password?',
    answer: (
      <>
        Go to{' '}
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          Forgot password
        </Link>{' '}
        and enter the email address or phone number on your account. If we send a link by email it is
        valid for 30 minutes; if we send a six-digit code by SMS it is valid for 10 minutes. For your
        safety the page says the same thing whether or not an account exists, so check your inbox or
        messages rather than the wording on screen. Changing your password signs you out everywhere
        else, which is the fastest way to end a session on a device you no longer have.
      </>
    ),
  },
  {
    term: 'Why does a station show as offline?',
    answer: (
      <>
        Charge points check in with the network regularly. When those check-ins stop — a dropped
        mobile signal, a site power cut, or maintenance — the network can no longer tell what the
        plugs are doing, so the station is marked offline and its plugs are shown as unavailable
        rather than guessed at. An offline charge point often still works locally with an RFID card,
        so it can be worth trying if you are already there. The session is reported to the network as
        soon as the charge point reconnects.
      </>
    ),
  },
  {
    term: 'Can I start a charge from this app?',
    answer: (
      <>
        Only where the operator has switched remote start on and you have a linked charge tag that
        the network recognises. When it is available you will see a start button on the station page
        once you are signed in; otherwise use your card at the charge point as usual. Stopping a
        running session from your session list works the same way.
      </>
    ),
  },
  {
    term: 'My session is missing from my history',
    answer: (
      <>
        Sessions are matched to you by charge tag, so check that the tag you used is linked under{' '}
        <Link href="/account" className="font-medium text-brand hover:underline">
          My account
        </Link>{' '}
        — the identifier has to match exactly, including case. A session started while the charge
        point was offline only appears once that charge point reconnects and uploads it.
      </>
    ),
  },
];

const PLUGS: Entry[] = [
  {
    term: 'Type 2 (Mennekes)',
    answer:
      'The standard AC plug in Europe and the default socket on most public AC posts. Usually 7 kW to 22 kW — good for a long stay, not for a quick top-up.',
  },
  {
    term: 'CCS2 (Combo 2)',
    answer:
      'A Type 2 plug with two extra DC pins below it. The common DC fast standard, typically 50 kW and upwards, with the cable attached to the charge point.',
  },
  {
    term: 'CHAdeMO',
    answer:
      'The older Japanese DC fast standard, still used by the Nissan Leaf and several imported models. Normally up to 50–100 kW.',
  },
  {
    term: 'GB/T',
    answer:
      'The Chinese DC fast standard, fitted to many vehicles imported from China. Physically incompatible with CCS2 and CHAdeMO.',
  },
  {
    term: 'Type 1 (J1772)',
    answer:
      'A single-phase AC plug found on older Japanese and North American cars. AC only, so charging is slower.',
  },
  {
    term: 'Schuko',
    answer:
      'An ordinary domestic socket. A last resort at roughly 2–3 kW; useful overnight, not for a stop on a journey.',
  },
];

function DefinitionList({ entries }: { entries: Entry[] }) {
  return (
    <dl className="divide-y divide-border">
      {entries.map((entry) => (
        <div key={entry.term} className="py-4 first:pt-0 last:pb-0">
          <dt className="text-sm font-semibold text-foreground">{entry.term}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-muted">{entry.answer}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Help</h1>
        <p className="mt-3 text-base text-muted">
          The questions drivers ask most often about {publicEnv.brandName}. If your answer is not
          here, the contact details are at the bottom of the page.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Common questions</CardTitle>
            </CardHeader>
            <CardBody>
              <DefinitionList entries={FAQ} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plug types</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-4 text-sm text-muted">
                Your car accepts one or two of these. Check the plug type on a station page before you
                travel to it — a fast charger with the wrong socket is no use.
              </p>
              <DefinitionList entries={PLUGS} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-muted">
              <p>
                For a fault at a charge point — a plug that will not release, a damaged cable, a
                screen that is dark — quote the charge point name shown on this site and the
                identifier printed on the unit itself.
              </p>
              <Alert tone="warning" title="Placeholder">
                Support contact details have not been configured for this deployment yet. Until the
                operator publishes them here, use the telephone number or email printed on the charge
                point.
              </Alert>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety at a charge point</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-muted">
                <li>Do not use a cable or plug that is cracked, burnt or wet inside.</li>
                <li>Stop the session before unplugging; do not pull a cable under load.</li>
                <li>Keep the cable off walkways so nobody trips over it.</li>
                <li>In an emergency press the stop button on the unit and call the operator.</li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>More</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <ButtonLink href="/pricing" variant="secondary" size="md" className="w-full">
                How pricing works
              </ButtonLink>
              <ButtonLink href="/stations" variant="primary" size="md" className="w-full">
                Find a charger
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
