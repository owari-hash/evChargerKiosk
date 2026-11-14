'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import {
  BASE_URL,
  DOC_ITEMS,
  type DocItem,
  type HttpMethod,
  type ParamDef,
  type ResponseSample,
} from './docs-data';

const METHOD_STYLE: Record<HttpMethod, { badge: string; text: string; bg: string }> = {
  GET: {
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/15',
  },
  POST: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  DELETE: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/15',
  },
  PATCH: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/15',
  },
};

export function DocsView() {
  const [activeId, setActiveId] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLang, setActiveLang] = useState<'curl' | 'nodejs' | 'python'>('curl');
  const [activeResponseStatus, setActiveResponseStatus] = useState<number>(200);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [mobileTab, setMobileTab] = useState<'docs' | 'code'>('docs');

  // Handle URL hash on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      const found = DOC_ITEMS.find((item) => item.id === hash);
      if (found) {
        setActiveId(found.id);
      }
    }
  }, []);

  const activeItem: DocItem = useMemo(() => {
    return DOC_ITEMS.find((item) => item.id === activeId) || DOC_ITEMS[0];
  }, [activeId]);

  // Set default response status for the selected item
  useEffect(() => {
    if (activeItem.responses && activeItem.responses.length > 0) {
      setActiveResponseStatus(activeItem.responses[0].status);
    }
  }, [activeItem]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DOC_ITEMS;
    return DOC_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.path?.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.method?.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Group items by category
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; items: DocItem[] }>();
    filteredItems.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, { label: item.categoryLabel, items: [] });
      }
      map.get(item.category)!.items.push(item);
    });
    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      items: val.items,
    }));
  }, [filteredItems]);

  const activeResponse: ResponseSample | undefined = useMemo(() => {
    if (!activeItem.responses) return undefined;
    return (
      activeItem.responses.find((r) => r.status === activeResponseStatus) ||
      activeItem.responses[0]
    );
  }, [activeItem, activeResponseStatus]);

  async function handleCopy(text: string, type: 'code' | 'response' | 'path') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else if (type === 'response') {
        setCopiedResponse(true);
        setTimeout(() => setCopiedResponse(false), 2000);
      } else if (type === 'path') {
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      }
    } catch {
      // ignore
    }
  }

  function selectItem(item: DocItem) {
    setActiveId(item.id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${item.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const currentSnippet = activeItem.codeSnippets
    ? activeItem.codeSnippets[activeLang]
    : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================================================================== */}
      {/* TOP SUB-HEADER: Mailchimp Developer Breadcrumbs & Actions             */}
      {/* ===================================================================== */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <Link
              href="/partners"
              className="text-muted hover:text-foreground font-medium flex items-center gap-1.5 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Түншүүд рүү буцах</span>
            </Link>
            <span className="text-muted">/</span>
            <span className="text-muted font-medium">Developer API</span>
            <span className="text-muted">/</span>
            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
              {activeItem.title}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              v1.0 REST API
            </span>

            <a
              href="https://eplug.mn/api/partner/docs/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-surface hover:bg-surface-muted text-foreground transition"
              title="OpenAPI 3.0.3 JSON татах (Postman / Swagger)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 text-brand">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <span className="hidden min-[420px]:inline">OpenAPI Spec</span>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="xl:hidden sticky top-26 z-10 border-b border-border bg-background p-2">
        <div className="flex rounded-lg bg-surface-muted p-1 text-xs font-medium">
          <button
            onClick={() => setMobileTab('docs')}
            className={`flex-1 py-1.5 rounded-md text-center transition ${
              mobileTab === 'docs'
                ? 'bg-background shadow text-foreground font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Баримтжуулалт (Docs)
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={`flex-1 py-1.5 rounded-md text-center transition ${
              mobileTab === 'code'
                ? 'bg-background shadow text-foreground font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Код & Хариу (Code & Response)
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3-COLUMN MAILCHIMP LAYOUT CONTAINER                                   */}
      {/* ===================================================================== */}
      <div className="mx-auto max-w-[1600px] flex flex-col xl:flex-row">
        {/* =================================================================== */}
        {/* COLUMN 1: LEFT SIDEBAR NAVIGATION (Sticky)                          */}
        {/* =================================================================== */}
        <aside className="w-full xl:w-72 2xl:w-80 shrink-0 border-r border-border xl:sticky xl:top-26 xl:h-[calc(100vh-6.5rem)] xl:overflow-y-auto bg-background/50">
          <div className="p-4 space-y-4">
            {/* Search Filter Input */}
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="API хайх (эндпойнт, түлхүүр үг)..."
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Navigation Tree */}
            <nav className="space-y-6 text-xs">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted/80 mb-1.5">
                    {cat.label}
                  </h3>
                  <ul className="space-y-0.5">
                    {cat.items.map((item) => {
                      const isActive = item.id === activeId;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => selectItem(item)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition ${
                              isActive
                                ? 'bg-brand/10 text-brand font-semibold shadow-xs'
                                : 'text-foreground/80 hover:bg-surface-muted hover:text-foreground'
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {item.method && (
                              <span
                                className={`shrink-0 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                  METHOD_STYLE[item.method].badge
                                }`}
                              >
                                {item.method}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="p-4 text-center text-xs text-muted">
                  Хайлтын илэрц олдсонгүй.
                </div>
              )}
            </nav>
          </div>
        </aside>

        {/* =================================================================== */}
        {/* COLUMN 2: CENTER DOCUMENTATION VIEW                                 */}
        {/* =================================================================== */}
        <main
          className={`flex-1 min-w-0 p-6 sm:p-8 lg:p-10 ${
            mobileTab === 'code' ? 'hidden xl:block' : 'block'
          }`}
        >
          <div className="max-w-2xl 2xl:max-w-3xl space-y-8">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-2">
                <span>{activeItem.categoryLabel}</span>
                {activeItem.scope && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-surface-muted text-muted font-mono text-[11px] border border-border">
                      Scope: {activeItem.scope}
                    </span>
                  </>
                )}
                {activeItem.authRequired && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] border border-amber-500/20">
                      Bearer Token Required
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {activeItem.title}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
                {activeItem.summary}
              </p>
            </div>

            {/* Endpoint Method & Path Bar (for endpoints) */}
            {activeItem.path && activeItem.method && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden font-mono text-xs sm:text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                      METHOD_STYLE[activeItem.method].badge
                    }`}
                  >
                    {activeItem.method}
                  </span>
                  <span className="font-semibold text-foreground truncate">
                    {activeItem.path}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(`${BASE_URL}${activeItem.path?.replace('/api/partner', '')}`, 'path')
                  }
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-surface-muted hover:bg-border/50 text-foreground transition"
                  title="URL хуулах"
                >
                  {copiedPath ? (
                    <span className="text-emerald-600 font-medium">Хуулагдлаа!</span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span className="hidden sm:inline">Хуулах</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Description & Detailed paragraphs */}
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <p>{activeItem.description}</p>
              {activeItem.paragraphs?.map((p, idx) => (
                <p key={idx} className="text-muted leading-relaxed">
                  {p}
                </p>
              ))}
            </div>

            {/* Specifications Table (if guide table exists) */}
            {activeItem.table && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted/60 border-b border-border">
                    <tr>
                      {activeItem.table.head.map((th, idx) => (
                        <th key={idx} className="py-2.5 px-3.5 font-semibold text-foreground">
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-[12px]">
                    {activeItem.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-surface-muted/30">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-3.5 ${
                              cIdx === 0
                                ? 'font-sans font-medium text-foreground'
                                : 'text-muted'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Path Parameters Section */}
            {activeItem.pathParams && activeItem.pathParams.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Path Parameters
                </h3>
                <div className="divide-y divide-border border-y border-border">
                  {activeItem.pathParams.map((param) => (
                    <div key={param.name} className="py-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">{param.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-muted text-muted text-[10px]">
                          {param.type}
                        </span>
                        {param.required ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">optional</span>
                        )}
                      </div>
                      <p className="text-muted text-xs leading-relaxed">{param.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters Section */}
            {activeItem.queryParams && activeItem.queryParams.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Query Parameters
                </h3>
                <div className="divide-y divide-border border-y border-border">
                  {activeItem.queryParams.map((param) => (
                    <div key={param.name} className="py-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">{param.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-muted text-muted text-[10px]">
                          {param.type}
                        </span>
                        {param.required ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">optional</span>
                        )}
                      </div>
                      <p className="text-muted text-xs leading-relaxed">{param.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body Parameters Section */}
            {activeItem.bodyParams && activeItem.bodyParams.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Request Body (JSON)
                  </h3>
                  <span className="text-[11px] font-mono text-muted">application/json</span>
                </div>
                <div className="divide-y divide-border border-y border-border">
                  {activeItem.bodyParams.map((param) => (
                    <div key={param.name} className="py-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">{param.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-muted text-muted text-[10px]">
                          {param.type}
                        </span>
                        {param.required ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">optional</span>
                        )}
                      </div>
                      <p className="text-muted text-xs leading-relaxed">{param.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Model Fields */}
            {activeItem.responseFields && activeItem.responseFields.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Response Schema Fields
                </h3>
                <div className="divide-y divide-border border-y border-border">
                  {activeItem.responseFields.map((field) => (
                    <div key={field.name} className="py-2.5 text-xs flex items-baseline justify-between gap-4">
                      <div>
                        <span className="font-mono font-bold text-foreground">{field.name}</span>
                        <p className="text-muted mt-0.5">{field.description}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-muted">
                        {field.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* =================================================================== */}
        {/* COLUMN 3: RIGHT DARK CODE CONSOLE (Mailchimp Signature Pane)         */}
        {/* =================================================================== */}
        <aside
          className={`w-full xl:w-[480px] 2xl:w-[540px] shrink-0 border-l border-slate-800 bg-[#0c1322] text-slate-100 xl:sticky xl:top-26 xl:h-[calc(100vh-6.5rem)] xl:overflow-y-auto ${
            mobileTab === 'docs' ? 'hidden xl:block' : 'block'
          }`}
        >
          <div className="p-4 sm:p-5 space-y-6">
            {/* REQUEST CODE SNIPPET BOX */}
            <div className="rounded-xl border border-slate-800 bg-[#090e18] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 bg-slate-900/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Request
                </span>
                <div className="flex items-center gap-1">
                  {(['curl', 'nodejs', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                        activeLang === lang
                          ? 'bg-brand text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'nodejs' ? 'Node.js' : lang === 'curl' ? 'cURL' : 'Python'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative p-3.5">
                <pre className="font-mono text-[11px] sm:text-[12px] leading-relaxed text-slate-200 overflow-x-auto whitespace-pre">
                  <code>{currentSnippet}</code>
                </pre>

                <button
                  onClick={() => handleCopy(currentSnippet, 'code')}
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
                  title="Код хуулах"
                >
                  {copiedCode ? (
                    <span className="text-emerald-400 font-bold">Хуулагдлаа!</span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RESPONSE SAMPLE BOX */}
            {activeItem.responses && activeItem.responses.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#090e18] overflow-hidden shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 bg-slate-900/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Response
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activeItem.responses.map((resp) => {
                      const isSelected = resp.status === activeResponseStatus;
                      const isOk = resp.status >= 200 && resp.status < 300;
                      return (
                        <button
                          key={resp.status}
                          onClick={() => setActiveResponseStatus(resp.status)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition ${
                            isSelected
                              ? isOk
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {resp.status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative p-3.5">
                  {activeResponse && (
                    <>
                      <div className="mb-2 text-[11px] text-slate-400 font-sans">
                        <span className="font-semibold text-slate-200">{activeResponse.title}</span>
                        {' — '}
                        <span>{activeResponse.description}</span>
                      </div>
                      <pre className="font-mono text-[11px] sm:text-[12px] leading-relaxed text-emerald-300 overflow-x-auto whitespace-pre">
                        <code>{JSON.stringify(activeResponse.body, null, 2)}</code>
                      </pre>
                    </>
                  )}

                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(activeResponse?.body ?? {}, null, 2),
                        'response',
                      )
                    }
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
                    title="JSON хуулах"
                  >
                    {copiedResponse ? (
                      <span className="text-emerald-400 font-bold">Хуулагдлаа!</span>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
