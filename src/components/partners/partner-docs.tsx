'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  API_BASE,
  MODULES,
  SECTIONS,
  type Endpoint,
  type HttpMethod,
  type Table,
} from '@/app/partners/api-spec';
import { cn } from '@/lib/utils';

const METHOD_TONE: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
  POST: 'bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  DELETE: 'bg-rose-500/12 text-rose-700 ring-rose-500/30 dark:text-rose-300',
};

function MethodBadge({ method, small }: { method: HttpMethod; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-mono font-bold ring-1',
        small ? 'h-5 w-12 text-[10px]' : 'h-6 px-2 text-[11px]',
        METHOD_TONE[method],
      )}
    >
      {method === 'DELETE' ? (small ? 'DEL' : 'DELETE') : method}
    </span>
  );
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

/** Sidebar entries: a section, then its endpoints. */
const NAV = SECTIONS.map((s) => ({
  id: s.id,
  title: s.title,
  icon: s.icon,
  endpoints: (s.endpoints ?? []).map((e) => ({ id: e.id, title: e.title, method: e.method, path: e.path })),
}));
const ALL_IDS = [...NAV.flatMap((s) => [s.id, ...s.endpoints.map((e) => e.id)]), 'contact'];

export function PartnerDocs({ contact }: { contact: { phone?: string; email?: string } }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('intro');

  // Highlight whatever section or endpoint is at the top of the screen.
  useEffect(() => {
    const els = ALL_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-90px 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const q = query.trim().toLowerCase();
  const nav = useMemo(() => {
    if (!q) return NAV;
    return NAV.map((s) => ({
      ...s,
      endpoints: s.endpoints.filter((e) => `${e.title} ${e.path} ${e.method}`.toLowerCase().includes(q)),
    })).filter((s) => s.title.toLowerCase().includes(q) || s.endpoints.length > 0);
  }, [q]);

  const activeSection = SECTIONS.find((s) => s.id === active || s.endpoints?.some((e) => e.id === active))?.id ?? active;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:pt-8">
      {/* Mobile section chips */}
      <nav aria-label="Агуулга" className="sticky top-14 z-20 -mx-4 flex gap-1.5 overflow-x-auto border-b border-border bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
        {NAV.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition',
              activeSection === s.id ? 'bg-brand text-brand-contrast ring-brand' : 'bg-surface text-muted ring-border',
            )}
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-2 grid gap-8 lg:mt-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <label className="relative block">
              <span className="sr-only">API хайх</span>
              <Icon d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Хайх…"
                className="h-9 w-full rounded-xl bg-surface pl-9 pr-3 text-sm ring-1 ring-border outline-none transition placeholder:text-muted focus:ring-brand"
              />
            </label>

            <nav aria-label="API агуулга" className="mt-4 space-y-1 text-sm">
              {nav.map((s) => (
                <div key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium transition',
                      activeSection === s.id ? 'bg-brand/10 text-brand' : 'text-foreground/80 hover:bg-surface-muted',
                    )}
                  >
                    <Icon d={s.icon} className="size-4 shrink-0" />
                    {s.title}
                  </a>
                  {s.endpoints.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {s.endpoints.map((e) => (
                        <li key={e.id}>
                          <a
                            href={`#${e.id}`}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition',
                              active === e.id ? 'bg-surface-muted text-foreground' : 'text-muted hover:text-foreground',
                            )}
                          >
                            <MethodBadge method={e.method} small />
                            <span className="truncate">{e.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {!q || 'холбоо барих'.includes(q) ? (
                <a
                  href="#contact"
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium transition',
                    active === 'contact' ? 'bg-brand/10 text-brand' : 'text-foreground/80 hover:bg-surface-muted',
                  )}
                >
                  <Icon d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" className="size-4 shrink-0" />
                  Холбоо барих
                </a>
              ) : null}
              {nav.length === 0 && <p className="px-2.5 py-2 text-xs text-muted">Олдсонгүй</p>}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 space-y-16">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <Icon d={section.icon} className="size-5" />
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{section.title}</h2>
              </div>
              <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted">{section.lead}</p>

              {section.id === 'intro' && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {MODULES.map((m) => (
                    <a
                      key={m.id}
                      href={`#${m.id}`}
                      className="group rounded-2xl bg-surface p-4 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-brand/40 hover:shadow-[var(--shadow-card)]"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand transition group-hover:scale-110">
                        <Icon d={m.icon} className="size-[18px]" />
                      </span>
                      <span className="mt-3 block font-semibold text-foreground">{m.title}</span>
                      <span className="mt-1 block text-sm text-muted">{m.body}</span>
                    </a>
                  ))}
                </div>
              )}

              {section.paragraphs && (
                <ul className="mt-4 space-y-2">
                  {section.paragraphs.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-foreground/90">
                      <Icon d="m5 12 5 5L20 7" className="mt-0.5 size-4 shrink-0 text-brand" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {section.table && <DocTable table={section.table} className="mt-6" />}

              {section.endpoints?.map((e) => <EndpointBlock key={e.id} endpoint={e} />)}

              {section.after?.paragraphs?.map((p) => (
                <p key={p} className="mt-6 text-sm text-muted">
                  {p}
                </p>
              ))}
              {section.after?.table && <DocTable table={section.after.table} className="mt-4" />}
            </section>
          ))}

          <section id="contact" className="scroll-mt-28">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand/15 via-surface to-surface p-6 ring-1 ring-brand/20 sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Холбоо барих</h2>
              <p className="mt-2 max-w-xl text-muted">
                Түнш болох, sandbox түлхүүр авах, гэрээ байгуулахаар бидэнтэй холбогдоно уу.
              </p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {contact.email && (
                  <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
                    <dt className="text-xs text-muted">Имэйл</dt>
                    <dd className="mt-1 font-semibold">
                      <a href={`mailto:${contact.email}`} className="text-brand hover:underline">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                )}
                {contact.phone && (
                  <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
                    <dt className="text-xs text-muted">Утас</dt>
                    <dd className="mt-1 font-semibold">
                      <a href={`tel:${contact.phone.split(',')[0].replace(/\s+/g, '')}`} className="text-brand hover:underline">
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <Link href="/contact" className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong">
                Хүсэлт илгээх
              </Link>
            </div>
          </section>
        </main>

      </div>
    </div>
  );
}

function DocTable({ table, className }: { table: Table; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl ring-1 ring-border', className)}>
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            {table.head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {table.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) => (
                <td key={i} className={cn('px-4 py-2.5', i === 0 ? 'font-mono text-[13px] font-medium text-foreground' : 'text-muted', i === 1 && table.head.length > 2 && 'font-mono text-[13px] text-foreground')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Tab = 'curl' | 'js' | 'response';

function curlOf(e: Endpoint): string {
  const lines = [`curl -X ${e.method} "${API_BASE}${e.example}"`];
  if (!e.noAuth) lines.push(`  -H "Authorization: Bearer $TOKEN"`);
  if (e.form) {
    lines.push(`  -H "Content-Type: application/x-www-form-urlencoded"`);
    lines.push(`  -d "${e.body}"`);
  } else if (e.body) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${e.body}'`);
  }
  return lines.join(' \\\n');
}

function jsOf(e: Endpoint): string {
  const headers: string[] = [];
  if (!e.noAuth) headers.push("    Authorization: `Bearer ${token}`,");
  if (e.form) headers.push("    'Content-Type': 'application/x-www-form-urlencoded',");
  else if (e.body) headers.push("    'Content-Type': 'application/json',");
  const opts = [`  method: '${e.method}',`];
  if (headers.length) opts.push('  headers: {', ...headers, '  },');
  if (e.body) opts.push(e.form ? `  body: '${e.body}',` : `  body: JSON.stringify(${e.body}),`);
  return `const res = await fetch('${API_BASE}${e.example}', {\n${opts.join('\n')}\n});\nconst data = await res.json();`;
}

function EndpointBlock({ endpoint: e }: { endpoint: Endpoint }) {
  const [tab, setTab] = useState<Tab>('curl');
  const [copied, setCopied] = useState(false);
  const code = tab === 'curl' ? curlOf(e) : tab === 'js' ? jsOf(e) : e.response;

  return (
    <article id={e.id} className="mt-8 scroll-mt-28 rounded-2xl bg-surface ring-1 ring-border shadow-[var(--shadow-card)]">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={e.method} />
          <code className="min-w-0 break-all font-mono text-sm font-semibold text-foreground">{e.path}</code>
          {e.scope && (
            <span className="ml-auto rounded-full bg-surface-muted px-2.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-border">
              {e.scope}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground">{e.title}</h3>
        <p className="mt-1 text-sm text-muted">{e.summary}</p>
      </div>

      <div className="grid gap-0 xl:grid-cols-2">
        <div className="p-4 sm:p-5">
          {e.params && e.params.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Параметр</p>
              <ul className="mt-2 divide-y divide-border">
                {e.params.map((p) => (
                  <li key={`${p.in}-${p.name}`} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[13px] font-semibold text-foreground">{p.name}</code>
                      <span className="font-mono text-[11px] text-muted">{p.type}</span>
                      <span className="rounded bg-surface-muted px-1.5 text-[10px] font-medium uppercase text-muted">{p.in}</span>
                      {p.required && <span className="text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-400">заавал</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{p.desc}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {e.notes?.map((n) => (
            <p key={n} className="mt-3 flex gap-2 rounded-lg bg-sky-500/8 p-3 text-[13px] text-foreground/90 ring-1 ring-sky-500/20">
              <Icon d="M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
              {n}
            </p>
          ))}
        </div>

        <div className="min-w-0 p-3 sm:p-4 xl:pl-0">
          <div className="overflow-hidden rounded-xl bg-[#0b1220] ring-1 ring-white/10">
            <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
              {(['curl', 'js', 'response'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition',
                    tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
                  )}
                >
                  {t === 'curl' ? 'cURL' : t === 'js' ? 'JavaScript' : 'Хариу 200'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(code).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  });
                }}
                className="ml-auto rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                {copied ? 'Хуулагдлаа ✓' : 'Хуулах'}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto p-4 text-[12.5px] leading-relaxed text-slate-200">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </article>
  );
}
