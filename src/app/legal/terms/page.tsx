import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, Card, CardBody } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { format, getTranslations, type Dictionary } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.terms.metaTitle, description: d.terms.metaDescription };
}

/** The numbered clauses, in order. Paragraphs within a clause are separate keys. */
function sections(d: Dictionary, brand: string): Array<{ heading: string; body: ReactNode }> {
  const t = d.terms;
  return [
    { heading: t.s1, body: [format(t.s1a, { brand }), t.s1b] },
    { heading: t.s2, body: [t.s2a, t.s2b] },
    { heading: t.s3, body: [t.s3a, t.s3b] },
    { heading: t.s4, body: [t.s4a, t.s4b] },
    { heading: t.s5, body: [t.s5a, t.s5b, t.s5c] },
    { heading: t.s6, body: [t.s6a] },
    { heading: t.s7, body: [t.s7a] },
    { heading: t.s8, body: [t.s8a] },
    { heading: t.s9, body: [t.s9a] },
    { heading: t.s10, body: [t.s10a] },
  ].map((section) => ({
    heading: section.heading,
    body: (section.body as string[]).map((paragraph, index) => <p key={index}>{paragraph}</p>),
  }));
}

export default async function TermsPage() {
  const { d } = await getTranslations();
  const brand = publicEnv.brandName;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="max-w-3xl">
        <Alert tone="warning" title={d.terms.draftTitle}>
          {d.terms.draftBody}
        </Alert>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {d.terms.title}
          </h1>
          <p className="mt-3 text-base text-muted">{format(d.terms.intro, { brand })}</p>
        </header>

        <Card className="mt-8">
          <CardBody className="space-y-8 py-6">
            {sections(d, brand).map((section, index) => (
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
          {d.terms.seeAlsoPrefix}{' '}
          <Link href="/legal/privacy" className="font-medium text-brand hover:underline">
            {d.terms.privacyLink}
          </Link>
          {d.terms.seeAlsoSuffix}
        </p>
      </div>
    </div>
  );
}
