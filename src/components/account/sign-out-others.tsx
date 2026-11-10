'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Button, Modal, ModalHeader } from '@/components/ui';
import { showToast } from '@/lib/toast-store';

const COPY = {
  mn: {
    label: 'Бусад төхөөрөмж',
    button: 'Бусад бүх төхөөрөмжөөс гарах',
    title: 'Бусад төхөөрөмжөөс гарах уу?',
    body: 'Энэ төхөөрөмжөөс бусад бүх утас, компьютер, апп дээрх нэвтрэлт тань шууд хаагдана. Утсаа гээсэн эсвэл өөр хүн нэвтэрсэн гэж сэжиглэж байвал ашиглаарай.',
    confirm: 'Тийм, гаргах',
    cancel: 'Болих',
    done: 'Бусад төхөөрөмжөөс гарлаа',
    failed: 'Амжилтгүй боллоо. Дахин оролдоно уу.',
  },
  en: {
    label: 'Other devices',
    button: 'Sign out of all other devices',
    title: 'Sign out everywhere else?',
    body: 'Every other phone, computer and app signed in to your account is signed out right away. Use this if you lost a phone or think someone else signed in.',
    confirm: 'Yes, sign them out',
    cancel: 'Cancel',
    done: 'Signed out of other devices',
    failed: 'That did not work. Please try again.',
  },
};

/** "Sign out everywhere else" — the server bumps the session version and re-issues this device's cookie. */
export function SignOutOthers() {
  const { locale } = useI18n();
  const t = COPY[locale === 'en' ? 'en' : 'mn'];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch('/app-api/account/sign-out-others', { method: 'POST' });
      if (!res.ok) throw new Error();
      showToast({ kind: 'success', title: t.done, body: '' });
      setOpen(false);
    } catch {
      showToast({ kind: 'error', title: t.failed, body: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-foreground">{t.label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-surface-muted"
      >
        {t.button}
        <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5M20 12H9M12 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
        </svg>
      </button>

      {open && (
      <Modal onClose={() => !busy && setOpen(false)}>
        <ModalHeader title={t.title} onClose={() => !busy && setOpen(false)} />
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted">{t.body}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant="danger" onClick={run} disabled={busy}>
              {t.confirm}
            </Button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
