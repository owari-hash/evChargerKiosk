'use client';

import { useState } from 'react';
import { Modal, ModalHeader } from '@/components/ui/modal';
import { useI18n } from '@/components/i18n-provider';

const SEEN_KEY = 'eplug-onboarding-seen';

function hasSeenOnboarding(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Private mode — it will just show again next visit, which is harmless.
  }
}

/**
 * A one-time, four-step walkthrough for a first-time visitor: find a
 * station, scan its QR, top up the wallet, get an e-Barimt. Shown once per
 * browser (localStorage), replayable from the help page's "Show the intro
 * again" link.
 */
export function OnboardingTour({ signedIn }: { signedIn: boolean }) {
  const { d } = useI18n();
  const [open, setOpen] = useState(() => !hasSeenOnboarding());
  const [step, setStep] = useState(0);

  const steps = [
    { icon: '📍', title: d.onboarding.step1Title, body: d.onboarding.step1Body },
    { icon: '📷', title: d.onboarding.step2Title, body: d.onboarding.step2Body },
    { icon: '💳', title: d.onboarding.step3Title, body: d.onboarding.step3Body },
    { icon: '🧾', title: d.onboarding.step4Title, body: d.onboarding.step4Body },
  ];

  function finish() {
    markOnboardingSeen();
    setOpen(false);
  }

  if (!open) return null;
  const last = step === steps.length - 1;
  const current = steps[step];

  return (
    <Modal onClose={finish} maxWidth="sm">
      <ModalHeader
        title={d.onboarding.title}
        subtitle={signedIn ? undefined : d.onboarding.subtitleGuest}
        onClose={finish}
        closeLabel={d.common.close}
      />
      <div className="px-6 py-6 text-center">
        <div className="text-5xl">{current.icon}</div>
        <h4 className="mt-4 text-base font-bold text-foreground">{current.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted">{current.body}</p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-brand' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={finish}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          {d.onboarding.skip}
        </button>
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
            >
              {d.onboarding.back}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
          >
            {last ? d.onboarding.done : d.onboarding.next}
          </button>
        </div>
      </div>
    </Modal>
  );
}
