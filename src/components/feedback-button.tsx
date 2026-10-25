'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from './i18n-provider';
import { Button, Field, Input, Modal, ModalHeader, Textarea } from './ui';
import { showToast } from '@/lib/toast-store';

/**
 * «Санал хүсэлт» form: lands in the console's Санал хүсэлт page. A signed-in
 * driver is known already, so only a guest is asked for a phone number to be
 * called back on. Used inline on /contact and inside the footer's dialog.
 */
export function FeedbackForm({
  signedIn,
  onCancel,
  onSent,
}: {
  signedIn: boolean;
  /** Shown as «Цуцлах» beside «Илгээх» when given (the dialog). */
  onCancel?: () => void;
  onSent?: () => void;
}) {
  const { d } = useI18n();
  const t = d.feedback;
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (message.trim().length < 1) {
      setError(t.messageRequired);
      return;
    }
    if (!signedIn && phone.replace(/\D/g, '').length < 8) {
      setError(t.phoneRequired);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/app-api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          phone: signedIn ? undefined : phone.trim(),
          source: 'web',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t.failed);
      showToast({ kind: 'success', title: t.sent, body: '' });
      setMessage('');
      setPhone('');
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!signedIn && (
        <Field label={t.phoneLabel} htmlFor="feedback-phone" required>
          <Input
            id="feedback-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9911 2233"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
      )}
      <Field label={t.messageLabel} htmlFor="feedback-message" required>
        <Textarea
          id="feedback-message"
          rows={5}
          maxLength={2000}
          placeholder={t.messagePlaceholder}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      {onCancel ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="danger" onClick={onCancel}>
            {d.common.cancel}
          </Button>
          <Button type="submit" loading={sending}>
            {t.send}
          </Button>
        </div>
      ) : (
        <Button type="submit" loading={sending} className="w-full justify-center sm:w-auto">
          {t.send}
        </Button>
      )}
    </form>
  );
}

/** The footer's «Санал хүсэлт» link: opens the form in a dialog. */
export function FeedbackButton({ signedIn }: { signedIn: boolean }) {
  const { d } = useI18n();
  const t = d.feedback;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="transition hover:text-foreground">
        {t.link}
      </button>

      {open && (
        <Modal onClose={close} maxWidth="md" closeOnBackdrop={false}>
          <ModalHeader title={t.title} subtitle={t.subtitle} onClose={close} closeLabel={d.common.close} />
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <FeedbackForm signedIn={signedIn} onCancel={close} onSent={close} />
          </div>
        </Modal>
      )}
    </>
  );
}
