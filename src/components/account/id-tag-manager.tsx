'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@/components/ui';
import type { PublicUser } from '@/lib/types';

interface IdTagResponse {
  user?: PublicUser;
  error?: string;
  fields?: Record<string, string>;
}

interface IdTagManagerProps {
  user: PublicUser;
}

export function IdTagManager({ user }: IdTagManagerProps) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(user.idTags);
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idTag = value.trim();
    if (!idTag) {
      setFieldError('Enter the code from your charge tag');
      return;
    }

    setAdding(true);
    setNotice('');
    setError('');
    setFieldError('');

    try {
      const res = await fetch('/api/account/id-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTag }),
      });
      const data = (await res.json().catch(() => ({}))) as IdTagResponse;

      if (!res.ok || !data.user) {
        setError(data.error ?? 'Could not link that charge tag. Please try again.');
        setFieldError(data.fields?.idTag ?? '');
        return;
      }

      setTags(data.user.idTags);
      setValue('');
      setNotice(`Charge tag ${idTag} is linked to your account.`);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setAdding(false);
    }
  }

  async function unlink(idTag: string) {
    setBusyTag(idTag);
    setNotice('');
    setError('');

    try {
      const res = await fetch(`/api/account/id-tags?idTag=${encodeURIComponent(idTag)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as IdTagResponse;

      if (!res.ok || !data.user) {
        setError(data.error ?? 'Could not unlink that charge tag. Please try again.');
        return;
      }

      setTags(data.user.idTags);
      setPendingTag(null);
      setNotice(`Charge tag ${idTag} is no longer linked to your account.`);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusyTag(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charge tags</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted">
          A charge tag is the RFID card or app code a charger reads to recognise you; your charging
          operator issues it and prints the code on the card.
        </p>

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}

        {tags.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
            No charge tags are linked yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
            {tags.map((tag) => (
              <li key={tag} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-sm text-foreground">{tag}</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {pendingTag === tag ? (
                    <>
                      <span className="text-sm text-muted">Unlink this tag?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={busyTag === tag}
                        onClick={() => unlink(tag)}
                      >
                        Yes, unlink
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPendingTag(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setNotice('');
                        setError('');
                        setPendingTag(tag);
                      }}
                    >
                      Unlink
                      <span className="sr-only"> charge tag {tag}</span>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} noValidate className="space-y-3 border-t border-border pt-4">
          <Field
            label="Add a charge tag"
            htmlFor="id-tag-value"
            hint="Enter the code printed on the card, exactly as shown."
            error={fieldError || undefined}
          >
            <Input
              id="id-tag-value"
              name="idTag"
              value={value}
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'id-tag-value-error' : 'id-tag-value-hint'}
              onChange={(event) => {
                setFieldError('');
                setValue(event.target.value);
              }}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={adding}>
            Link tag
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
