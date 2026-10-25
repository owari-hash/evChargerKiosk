'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from './i18n-provider';
import { Button, Field, Input, Modal, ModalHeader, Textarea } from './ui';
import { showToast } from '@/lib/toast-store';

/**
 * «Санал хүсэлт» in the footer: a short form that lands in the console's
 * Санал хүсэлт page. A signed-in driver is known already, so only a guest is
 * asked for a phone number to be called back on.
 */
export function FeedbackButton({ signedIn }: { signedIn: boolean }) {
  const { d } = useI18n();
  const t = d.feedback;
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
  }

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
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="transition hover:text-foreground">
        {t.link}
      </button>

      {open && (
        <Modal onClose={close} maxWidth="md" closeOnBackdrop={false}>
          <ModalHeader title={t.title} subtitle={t.subtitle} onClose={close} closeLabel={d.common.close} />
          <form onSubmit={submit} noValidate className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
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
            <div className="grid grid-cols-2 gap-2.5">
              <Button type="button" variant="danger" onClick={close}>
                {d.common.cancel}
              </Button>
              <Button type="submit" loading={sending}>
                {t.send}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
