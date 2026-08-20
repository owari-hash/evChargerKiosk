import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { format, getTranslations, type Dictionary } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.privacy.metaTitle, description: d.privacy.metaDescription };
}

interface Row {
  item: string;
  detail: ReactNode;
}

/** Kept deliberately literal: every row below corresponds to a stored field. */
function stored(d: Dictionary): Row[] {
  const p = d.privacy;
  return [
    { item: p.itemName, detail: p.itemNameBody },
    { item: p.itemEmail, detail: p.itemEmailBody },
    { item: p.itemPhone, detail: p.itemPhoneBody },
    { item: p.itemPassword, detail: p.itemPasswordBody },
    { item: p.itemTags, detail: p.itemTagsBody },
    { item: p.itemState, detail: p.itemStateBody },
    { item: p.itemTokens, detail: p.itemTokensBody },
    { item: p.itemWallet, detail: p.itemWalletBody },
    { item: p.itemSessions, detail: p.itemSessionsBody },
  ];
}

function sections(d: Dictionary): Array<{ heading: string; body: ReactNode }> {
  const p = d.privacy;
  return [
    {
      heading: p.s1,
      body: (
        <ul className="list-disc space-y-1.5 pl-5">
          <li>{p.s1a}</li>
          <li>{p.s1b}</li>
          <li>{p.s1c}</li>
          <li>{p.s1d}</li>
          <li>{p.s1e}</li>
        </ul>
      ),
    },
    { heading: p.s2, body: [p.s2a, p.s2b] },
    { heading: p.s3, body: [p.s3a, p.s3b] },
    { heading: p.s4, body: [p.s4a, p.s4b, p.s4c] },
    { heading: p.s5, body: [p.s5a] },
    { heading: p.s6, body: [p.s6a, p.s6b] },
  ].map((section) => ({
    heading: section.heading,
    body: Array.isArray(section.body)
      ? (section.body as string[]).map((paragraph, index) => <p key={index}>{paragraph}</p>)
      : section.body,
  }));
}

export default async function PrivacyPage() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="max-w-3xl">
        <Alert tone="warning" title={d.privacy.draftTitle}>
          {d.privacy.draftBody}
        </Alert>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {d.privacy.title}
          </h1>
          <p className="mt-3 text-base text-muted">
            {format(d.privacy.intro, { brand: publicEnv.brandName })}
          </p>
        </header>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{d.privacy.storedTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="divide-y divide-border">
              {stored(d).map((row) => (
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
            {sections(d).map((section, index) => (
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
          {d.privacy.seeAlsoPrefix}{' '}
          <Link href="/legal/terms" className="font-medium text-brand hover:underline">
            {d.privacy.termsLink}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
