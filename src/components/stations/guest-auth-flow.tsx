'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { useToastMessage } from '@/lib/use-toast-message';

interface GuestAuthFlowProps {
  returnTo: string;
  onSuccess: () => void;
}

export function GuestAuthFlow({ returnTo, onSuccess }: GuestAuthFlowProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useToastMessage(error, 'error');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cleanPhone = phone.replace(/[\s\-]/g, '');

  async function handleSendCode(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Утасны дугаараа 8 оронтой бүтэн оруулна уу (жишээ: 99112233)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/app-api/auth/guest/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        devCode?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Код илгээж чадсангүй. Дахин оролдоно уу.');
      }

      setStep('code');
      startCountdown();
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!code || code.length < 6) {
      setError('6 оронтой баталгаажуулах кодоо оруулна уу');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/app-api/auth/guest/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: code.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Баталгаажуулах код буруу эсвэл хугацаа нь дууссан байна');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Баталгаажуулалт амжилтгүй боллоо');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/[0.04] to-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Шууд цэнэглэх (Бүртгэлгүйгээр)</h3>
            <p className="text-xs text-muted">Утасны дугаараараа баталгаажуулаад шууд цэнэглэнэ</p>
          </div>
        </div>
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="text-xs font-medium text-brand hover:underline shrink-0"
        >
          Бүртгэлтэй эрхээр нэвтрэх
        </Link>
      </div>


      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="mt-4 space-y-3">
          <Field label="Утасны дугаар" htmlFor="guest-phone" hint="Апп татахгүй, нууц үг зоохгүй">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-muted">
                +976
              </span>
              <Input
                id="guest-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="9911 2233"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-14 text-base tracking-wider font-semibold"
                autoFocus
              />
            </div>
          </Field>

          <Button type="submit" loading={loading} className="w-full">
            Баталгаажуулах код авах
          </Button>

          <p className="text-center text-[11px] text-muted">
            Таны оруулсан дугаарт 6 оронтой нэг удаагийн баталгаажуулах SMS илгээнэ.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              Код илгээсэн: <strong className="text-foreground">{cleanPhone}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError(null);
              }}
              className="font-medium text-brand hover:underline"
            >
              Дугаар солих
            </button>
          </div>

          <Field label="6 оронтой баталгаажуулах код" htmlFor="guest-otp">
            <Input
              id="guest-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl font-mono tracking-widest font-bold"
              autoFocus
            />
          </Field>

          {devCode && (
            <div className="flex items-center justify-between rounded-lg bg-surface-muted p-2 text-xs text-muted">
              <span>Хөгжүүлэлтийн код: <strong className="font-mono text-brand">{devCode}</strong></span>
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="font-semibold text-brand hover:underline"
              >
                Бөглөх
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" loading={loading} className="w-full">
              Баталгаажуулж үргэлжлүүлэх
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleSendCode()}
              disabled={loading || countdown > 0}
              className="text-xs text-muted"
            >
              {countdown > 0 ? `Код дахин илгээх (${countdown}с)` : 'Код дахин илгээх'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
