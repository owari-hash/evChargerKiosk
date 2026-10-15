'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { scopedKey } from '@/lib/user-scope';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'eplug-assistant-history';
const MAX_STORED = 20;

/** The chat is stored per driver (`guest` while signed out), never shared between them. */
function loadHistory(key: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    );
  } catch {
    return [];
  }
}

function saveHistory(key: string, messages: ChatMessage[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // Private mode or full storage — the conversation just will not persist.
  }
}

/**
 * Floating assistant button + chat panel, present on every kiosk page.
 *
 * Stateless on the server: the whole conversation lives in `localStorage` and
 * is resent with every turn, same contract as the backend's `/app-api/assistant`
 * (itself a port of turees' aiTuslakh — see that route's own docstring).
 */
export function AssistantWidget({ userId }: { userId: string | null }) {
  const signedIn = userId !== null;
  const storageKey = scopedKey(STORAGE_KEY, userId);
  const { d } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(storageKey));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length) saveHistory(storageKey, messages);
  }, [storageKey, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setError(null);

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setMessages(next);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/app-api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          page: pathname,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? d.assistant.error);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : d.assistant.error);
      // Drop the empty assistant placeholder the failed turn left behind.
      setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="flex h-[32rem] max-h-[70vh] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{d.assistant.label}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={newChat}
                className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
              >
                {d.assistant.newChat}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={d.assistant.close}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="rounded-xl bg-surface-muted px-3 py-2 text-sm text-foreground">
                {d.assistant.greeting}
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-brand text-brand-contrast'
                      : 'bg-surface-muted text-foreground',
                  )}
                >
                  {m.content || (streaming && i === messages.length - 1 ? d.assistant.thinking : '')}
                </div>
              </div>
            ))}
            {!signedIn ? (
              <p className="text-center text-xs text-muted">{d.assistant.signInHint}</p>
            ) : null}
            {error ? <p className="text-center text-xs text-danger">{error}</p> : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={d.assistant.placeholder}
              disabled={streaming}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label={d.assistant.send}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-contrast disabled:opacity-50"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? d.assistant.close : d.assistant.open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-contrast shadow-lg transition hover:bg-brand-strong active:scale-95"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
