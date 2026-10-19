'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

/** Where the driver dragged the launcher: which side, and px from the bottom. */
interface Dock {
  side: 'left' | 'right';
  bottom: number;
}

const DOCK_KEY = 'eplug-assistant-dock';
const EDGE = 20;
const BUTTON = 56;
/** Movement past this many px turns a press into a drag, not a tap. */
const DRAG_SLOP = 6;

/** Returns the default dock position — 35% up from the bottom on the right side,
 *  so the button spawns roughly in the centre-right of the viewport, matching
 *  the position shown on mobile. Falls back to 245px on the server. */
function getDefaultDock(): Dock {
  const h = typeof window !== 'undefined' ? window.innerHeight : 700;
  return { side: 'right', bottom: Math.round(h * 0.35) };
}

const dockListeners = new Set<() => void>();

/** The stored dock as a string, so the snapshot is stable between reads. */
function readDock(): string {
  try {
    return window.localStorage.getItem(DOCK_KEY) ?? JSON.stringify(getDefaultDock());
  } catch {
    return JSON.stringify(getDefaultDock());
  }
}

function subscribeDock(listener: () => void): () => void {
  dockListeners.add(listener);
  return () => dockListeners.delete(listener);
}

function parseDock(raw: string): Dock {
  try {
    const parsed = JSON.parse(raw) as Partial<Dock>;
    if ((parsed.side === 'left' || parsed.side === 'right') && typeof parsed.bottom === 'number') {
      return { side: parsed.side, bottom: parsed.bottom };
    }
  } catch {
    // Unreadable value: fall back to the default position.
  }
  return getDefaultDock();
}

function saveDock(dock: Dock): void {
  try {
    window.localStorage.setItem(DOCK_KEY, JSON.stringify(dock));
  } catch {
    // Blocked storage: the spot just will not be remembered.
  }
  dockListeners.forEach((l) => l());
}

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

  // The launcher can be dragged out of the way of page content (it sat on the
  // footer links on phones) and snaps to the nearer side edge when let go.
  const dock = parseDock(useSyncExternalStore(subscribeDock, readDock, () => JSON.stringify(getDefaultDock())));
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  function clampBottom(bottom: number): number {
    return Math.min(Math.max(bottom, EDGE), window.innerHeight - BUTTON - EDGE);
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    pressRef.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    if (!press) return;
    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_SLOP) return;
    press.moved = true;
    setDrag({
      x: Math.min(Math.max(e.clientX - BUTTON / 2, EDGE), window.innerWidth - BUTTON - EDGE),
      y: Math.min(Math.max(e.clientY - BUTTON / 2, EDGE), window.innerHeight - BUTTON - EDGE),
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press?.moved) {
      setOpen((o) => !o);
      return;
    }
    const next: Dock = {
      side: e.clientX < window.innerWidth / 2 ? 'left' : 'right',
      bottom: clampBottom(window.innerHeight - e.clientY - BUTTON / 2),
    };
    setDrag(null);
    saveDock(next);
  }

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
    <div
      className={cn(
        'fixed z-40 flex flex-col gap-3',
        dock.side === 'left' ? 'items-start' : 'items-end',
        drag ? '' : 'transition-[left,right,bottom] duration-200 ease-out',
      )}
      style={
        drag
          ? { left: drag.x, top: drag.y }
          : { bottom: dock.bottom, [dock.side]: EDGE }
      }
    >
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pressRef.current = null;
          setDrag(null);
        }}
        onKeyDown={(e) => {
          // Pointer handlers replace onClick, so keep the keyboard working.
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-label={open ? d.assistant.close : d.assistant.open}
        className={cn(
          'flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-brand text-brand-contrast shadow-lg transition hover:bg-brand-strong',
          drag ? 'scale-105 cursor-grabbing shadow-2xl' : 'cursor-grab active:scale-95',
        )}
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
