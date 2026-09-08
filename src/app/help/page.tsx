import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Alert, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { format, getTranslations, type Dictionary } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.help.metaTitle, description: d.help.metaDescription };
}

interface Entry {
  term: string;
  answer: ReactNode;
}

/** The FAQ and plug glossary, in the order they are shown. */
function faq(d: Dictionary): Entry[] {
  return [
    { term: d.help.q1, answer: d.help.a1 },
    { term: d.help.q2, answer: d.help.a2 },
    { term: d.help.q3, answer: d.help.a3 },
    { term: d.help.q4, answer: d.help.a4 },
    { term: d.help.q5, answer: d.help.a5 },
    { term: d.help.q6, answer: d.help.a6 },
    { term: d.help.q7, answer: d.help.a7 },
    { term: d.help.q8, answer: d.help.a8 },
  ];
}

function plugs(d: Dictionary): Entry[] {
  return [
    { term: d.help.plug1, answer: d.help.plug1Body },
    { term: d.help.plug2, answer: d.help.plug2Body },
    { term: d.help.plug3, answer: d.help.plug3Body },
    { term: d.help.plug4, answer: d.help.plug4Body },
    { term: d.help.plug5, answer: d.help.plug5Body },
    { term: d.help.plug6, answer: d.help.plug6Body },
  ];
}

/** Collapsed by default so the whole FAQ fits on screen; each entry opens on its own. */
function AccordionList({ entries }: { entries: Entry[] }) {
  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => (
        <details key={entry.term} className="group py-3 first:pt-0 last:pb-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {entry.term}
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="mt-1.5 text-sm leading-relaxed text-muted">{entry.answer}</div>
        </details>
      ))}
    </div>
  );
}

export default async function HelpPage() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {d.help.title}
        </h1>
        <p className="mt-3 text-base text-muted">
          {format(d.help.intro, { brand: publicEnv.brandName })}
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{d.help.faqTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <AccordionList entries={faq(d)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{d.help.plugsTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-4 text-sm text-muted">{d.help.plugsIntro}</p>
              <AccordionList entries={plugs(d)} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:h-full">
          <Card>
            <CardHeader>
              <CardTitle>{d.help.contactTitle}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-muted">
              <p>{d.help.contactBody}</p>
              <Alert tone="warning" title={d.help.contactPlaceholderTitle}>
                {d.help.contactPlaceholderBody}
              </Alert>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{d.help.safetyTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-muted">
                <li>{d.help.safety1}</li>
                <li>{d.help.safety2}</li>
                <li>{d.help.safety3}</li>
                <li>{d.help.safety4}</li>
              </ul>
            </CardBody>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <CardTitle>{d.help.moreTitle}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-1 flex-col justify-center space-y-2">
              <ButtonLink href="/account/wallet" variant="secondary" size="md" className="w-full">
                {d.wallet.title}
              </ButtonLink>
              <ButtonLink href="/pricing" variant="secondary" size="md" className="w-full">
                {d.help.howPricingWorks}
              </ButtonLink>
              <ButtonLink href="/stations" variant="primary" size="md" className="w-full">
                {d.stations.title}
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
