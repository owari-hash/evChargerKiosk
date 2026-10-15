'use client';

import 'driver.js/dist/driver.css';
import type { Driver, DriveStep, PopoverDOM } from 'driver.js';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { Dictionary } from '@/lib/i18n';
import { anyModalOpen, setGuideActive, subscribeOverlays } from '@/lib/overlay-lock';

/**
 * First-run spotlight guide over the signed-in area, in the style of the
 * mobile app's coach card.
 *
 * The backend decides who sees it: a new account's `pendingGuides` holds
 * 'web' until `POST /app-api/account/guides/web/done`. That call is made when
 * the driver finishes the last step, or leaves early with «Дахиж харахгүй»
 * ticked. Leaving early without it only hides the guide for this browser
 * session (sessionStorage), so it comes back on the next sign-in or session.
 *
 * Replays (help page, user menu) run the same steps without the checkbox and
 * never call the server.
 */

/** 'skip' — hidden for this session; 'done' — marked done, server may still need telling. */
const SESSION_FLAG = 'eplug-guide-web';
const REPLAY_FLAG = 'eplug-guide-web-replay';
const START_EVENT = 'eplug:guide-start';
const GUIDE_HOME = '/account';
const DONE_URL = '/app-api/account/guides/web/done';

type Mode = 'auto' | 'replay';
type StepKey = 'accountNav' | 'wallet' | 'sessions' | 'chargeTag' | 'map' | 'menu';

/** Each step lists its targets in order of preference; the first visible one wins. */
const STEP_TARGETS: { key: StepKey; targets: string[] }[] = [
  { key: 'accountNav', targets: ['account-nav'] },
  { key: 'wallet', targets: ['nav-wallet'] },
  { key: 'sessions', targets: ['nav-sessions'] },
  { key: 'chargeTag', targets: ['charge-tag'] },
  { key: 'map', targets: ['nav-map', 'nav-toggle'] },
  { key: 'menu', targets: ['user-menu', 'nav-toggle'] },
];

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked: the guide may show once more, which is harmless.
  }
}

function isInAccount(pathname: string): boolean {
  return pathname === GUIDE_HOME || pathname.startsWith(`${GUIDE_HOME}/`);
}

/** A driver who came from a charger's QR sticker is mid scan-to-charge; never cover that. */
function arrivedFromQr(): boolean {
  return new URLSearchParams(window.location.search).get('via') === 'qr';
}

function visibleTarget(name: string): Element | null {
  for (const el of document.querySelectorAll(`[data-tour="${name}"]`)) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

/** Resolves the steps present on this page; neighbours that land on the same element merge into the later one. */
function resolveSteps(): { key: StepKey; element: Element }[] {
  const found: { key: StepKey; element: Element }[] = [];
  for (const step of STEP_TARGETS) {
    const element = step.targets.map(visibleTarget).find((el): el is Element => el !== null);
    if (!element) continue;
    if (found.at(-1)?.element === element) found.pop();
    found.push({ key: step.key, element });
  }
  return found;
}

/** Starts the guide from anywhere: right away inside the account area, or after navigating there. */
export function useStartGuide(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (isInAccount(pathname)) {
      window.dispatchEvent(new Event(START_EVENT));
    } else {
      writeSession(REPLAY_FLAG, '1');
      router.push(GUIDE_HOME);
    }
  }, [pathname, router]);
}

export function GuideReplayButton({ className, label }: { className?: string; label: string }) {
  const startGuide = useStartGuide();
  return (
    <button type="button" onClick={startGuide} className={className}>
      {label}
    </button>
  );
}

/** A pulsing ring kept over the highlighted element; a fixed overlay, so no ancestor can clip it. */
function createRing() {
  const ring = document.createElement('div');
  ring.className = 'evg-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  let target: Element | null = null;
  let frame = 0;

  const place = () => {
    if (target) {
      const r = target.getBoundingClientRect();
      const pad = 7;
      ring.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
      ring.style.width = `${r.width + pad * 2}px`;
      ring.style.height = `${r.height + pad * 2}px`;
      ring.style.opacity = '1';
    }
    frame = requestAnimationFrame(place);
  };
  frame = requestAnimationFrame(place);

  return {
    track(el: Element | undefined) {
      target = el ?? null;
      if (!target) ring.style.opacity = '0';
    },
    remove() {
      cancelAnimationFrame(frame);
      ring.remove();
    },
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const TAG_ICON =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';

interface CardOptions {
  popover: PopoverDOM;
  driver: Driver;
  index: number;
  total: number;
  copy: Dictionary['guide'];
  stepKey: StepKey;
  mode: Mode;
  dontShow: { current: boolean };
  outcome: { current: 'finish' | 'close' };
}

/** Replaces driver.js's default popover body with the coach card. */
function renderCard({ popover, driver, index, total, copy, stepKey, mode, dontShow, outcome }: CardOptions) {
  const step = copy.steps[stepKey];
  const isLast = index === total - 1;
  popover.wrapper.querySelector('.evg-card')?.remove();

  const card = el('div', 'evg-card');
  card.appendChild(el('span', 'evg-glow'));

  const close = el('button', 'evg-close');
  close.type = 'button';
  close.setAttribute('aria-label', copy.close);
  close.innerHTML = CLOSE_ICON;
  close.onclick = () => {
    outcome.current = 'close';
    driver.destroy();
  };
  card.appendChild(close);

  const head = el('div', 'evg-head');
  const tag = el('span', 'evg-tag');
  tag.innerHTML = TAG_ICON;
  tag.appendChild(el('span', '', step.tag));
  head.appendChild(tag);
  head.appendChild(el('span', 'evg-count', `${index + 1} / ${total}`));
  card.appendChild(head);

  const title = el('h3', 'evg-title', step.title);
  title.id = 'evg-title';
  card.appendChild(title);
  card.appendChild(el('p', 'evg-desc', step.description));

  if (mode === 'auto') {
    const label = el('label', 'evg-check');
    const box = el('input', '');
    box.type = 'checkbox';
    box.checked = dontShow.current;
    box.onchange = () => {
      dontShow.current = box.checked;
    };
    label.appendChild(box);
    label.appendChild(el('span', 'evg-check-box'));
    label.appendChild(el('span', '', copy.dontShowAgain));
    card.appendChild(label);
  }

  const foot = el('div', 'evg-foot');
  const skip = el('button', 'evg-skip', copy.skip);
  skip.type = 'button';
  skip.onclick = () => {
    outcome.current = 'close';
    driver.destroy();
  };
  foot.appendChild(skip);

  const dots = el('div', 'evg-dots');
  for (let i = 0; i < total; i++) dots.appendChild(el('span', i === index ? 'evg-dot is-active' : 'evg-dot'));
  foot.appendChild(dots);

  const next = el('button', 'evg-next', isLast ? copy.done : copy.next);
  next.type = 'button';
  next.onclick = () => {
    if (isLast) {
      outcome.current = 'finish';
      driver.destroy();
    } else {
      driver.moveNext();
    }
  };
  foot.appendChild(next);
  card.appendChild(foot);

  popover.wrapper.setAttribute('role', 'dialog');
  popover.wrapper.setAttribute('aria-labelledby', 'evg-title');
  popover.wrapper.appendChild(card);
  requestAnimationFrame(() => next.focus({ preventScroll: true }));
}

export function SpotlightGuide({ signedIn, pending }: { signedIn: boolean; pending: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const autoStartedRef = useRef(false);
  const retriedRef = useRef(false);
  const copyRef = useRef(d.guide);
  useEffect(() => {
    copyRef.current = d.guide;
  }, [d.guide]);

  const markDone = useCallback(async () => {
    // Set first: if the call fails, this session will not loop the guide, and
    // the next visit to the account area retries the call.
    writeSession(SESSION_FLAG, 'done');
    try {
      const res = await fetch(DONE_URL, { method: 'POST' });
      if (res.ok) router.refresh();
    } catch {
      // Retried on the next visit while the flag says 'done'.
    }
  }, [router]);

  const start = useCallback(
    async (mode: Mode) => {
      if (driverRef.current?.isActive() || anyModalOpen()) return;
      const resolved = resolveSteps();
      if (resolved.length === 0) return;

      const { driver } = await import('driver.js');
      if (driverRef.current?.isActive() || anyModalOpen()) return;

      const ring = createRing();
      const dontShow = { current: false };
      const outcome: { current: 'finish' | 'close' } = { current: 'close' };
      // Beside the sidebar on a wide screen; under the tab strip on a phone.
      const wide = window.matchMedia('(min-width: 768px)').matches;
      const sideNav: StepKey[] = ['accountNav', 'wallet', 'sessions'];
      const steps: DriveStep[] = resolved.map((step) => ({
        element: step.element,
        data: { key: step.key },
        popover: {
          side: wide && sideNav.includes(step.key) ? 'right' : 'bottom',
          align: 'start',
        },
      }));

      const instance = driver({
        steps,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        allowKeyboardControl: true,
        overlayClickBehavior: () => undefined,
        disableActiveInteraction: true,
        overlayColor: '#010805',
        overlayOpacity: 0.66,
        stagePadding: 6,
        stageRadius: 14,
        popoverOffset: 16,
        popoverClass: 'evg-popover',
        showButtons: [],
        showProgress: false,
        onHighlighted: (element) => ring.track(element),
        onDeselected: () => ring.track(undefined),
        onPopoverRender: (popover, opts) => {
          const index = opts.state.activeIndex ?? 0;
          renderCard({
            popover,
            driver: opts.driver,
            index,
            total: steps.length,
            copy: copyRef.current,
            stepKey: steps[index].data?.key as StepKey,
            mode,
            dontShow,
            outcome,
          });
        },
        onDestroyed: () => {
          ring.remove();
          driverRef.current = null;
          setGuideActive(false);
          if (mode !== 'auto') return;
          if (outcome.current === 'finish' || dontShow.current) void markDone();
          else writeSession(SESSION_FLAG, 'skip');
        },
      });
      driverRef.current = instance;
      setGuideActive(true);
      instance.drive();
    },
    [markDone],
  );

  // Signing out ends the "not this session" skip; the next sign-in sees the guide again.
  useEffect(() => {
    if (!signedIn && readSession(SESSION_FLAG) === 'skip') writeSession(SESSION_FLAG, null);
    if (!signedIn) autoStartedRef.current = false;
  }, [signedIn]);

  // First run: only for a signed-in driver the backend still owes the guide,
  // only in the account area (never the charging pages /stations/[id], /c/[code]),
  // and only once no other popup, such as an announcement, is on screen.
  useEffect(() => {
    if (!signedIn || !pending || !isInAccount(pathname) || arrivedFromQr()) return;
    const flag = readSession(SESSION_FLAG);
    if (flag === 'done') {
      if (!retriedRef.current) {
        retriedRef.current = true;
        void markDone();
      }
      return;
    }
    if (flag === 'skip' || autoStartedRef.current) return;

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (autoStartedRef.current || anyModalOpen()) return;
        autoStartedRef.current = true;
        void start('auto');
      }, 700);
    };
    // Re-arms whenever a modal opens or closes, so the guide follows the popup.
    const unsubscribe = subscribeOverlays(() => {
      if (anyModalOpen()) window.clearTimeout(timer);
      else schedule();
    });
    schedule();
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [signedIn, pending, pathname, start, markDone]);

  // Replays: a request carried over a navigation, a direct event, or `?tour=1` in development.
  useEffect(() => {
    if (!signedIn || !isInAccount(pathname)) return;
    const devForce =
      process.env.NODE_ENV !== 'production' &&
      new URLSearchParams(window.location.search).get('tour') === '1';
    if (readSession(REPLAY_FLAG) !== '1' && !devForce) return;
    writeSession(REPLAY_FLAG, null);
    const timer = window.setTimeout(() => void start('replay'), 500);
    return () => window.clearTimeout(timer);
  }, [signedIn, pathname, start]);

  useEffect(() => {
    const onStart = () => void start('replay');
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [start]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  return null;
}
