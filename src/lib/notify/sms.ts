import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serverEnv } from '@/lib/env';
import type { DeliveryResult } from './email';

export interface SmsMessage {
  to: string;
  text: string;
}

async function sendViaConsole(message: SmsMessage): Promise<DeliveryResult> {
  const line = `\n=== SMS ${new Date().toISOString()} ===\nTo: ${message.to}\n\n${message.text}\n`;
  console.info(line);
  try {
    const dir = path.join(process.cwd(), '.data');
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, 'outbox.log'), line, 'utf8');
  } catch {
    // Non-fatal, same as for email.
  }
  return { delivered: true, provider: 'console' };
}

/**
 * Generic HTTP gateway — covers most local SMS providers.
 *
 *   SMS_HTTP_URL=https://api.provider.mn/send?to={to}&text={text}&key=xxx
 *   SMS_HTTP_METHOD=GET
 *
 * or with a JSON body:
 *
 *   SMS_HTTP_URL=https://api.provider.mn/send
 *   SMS_HTTP_METHOD=POST
 *   SMS_HTTP_BODY={"to":"{to}","message":"{text}","from":"{from}"}
 *   SMS_HTTP_HEADERS={"Authorization":"Bearer xxx"}
 */
async function sendViaHttp(message: SmsMessage): Promise<DeliveryResult> {
  const cfg = serverEnv.smsHttp();
  if (!cfg.url) return { delivered: false, provider: 'http', error: 'SMS_HTTP_URL is not set' };

  const fill = (template: string, encode: boolean) =>
    template
      .replaceAll('{to}', encode ? encodeURIComponent(message.to) : message.to)
      .replaceAll('{text}', encode ? encodeURIComponent(message.text) : message.text)
      .replaceAll('{from}', encode ? encodeURIComponent(serverEnv.smsFrom()) : serverEnv.smsFrom());

  const url = fill(cfg.url, true);
  const headers: Record<string, string> = cfg.headers ? JSON.parse(cfg.headers) : {};
  const init: RequestInit = { method: cfg.method, headers };

  if (cfg.method !== 'GET' && cfg.body) {
    headers['Content-Type'] ??= 'application/json';
    init.body = fill(cfg.body, false);
  }

  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok) {
    return { delivered: false, provider: 'http', error: `${res.status} ${body.slice(0, 200)}` };
  }
  return { delivered: true, provider: 'http', id: body.slice(0, 120) };
}

async function sendViaTwilio(message: SmsMessage): Promise<DeliveryResult> {
  const cfg = serverEnv.twilio();
  if (!cfg.accountSid || !cfg.authToken || !cfg.from) {
    return { delivered: false, provider: 'twilio', error: 'Twilio credentials are incomplete' };
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: message.to, From: cfg.from, Body: message.text }),
    },
  );

  const json = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok) {
    return { delivered: false, provider: 'twilio', error: json.message ?? `HTTP ${res.status}` };
  }
  return { delivered: true, provider: 'twilio', id: json.sid };
}

async function sendViaMessagePro(message: SmsMessage): Promise<DeliveryResult> {
  const cfg = serverEnv.messagePro();
  if (!cfg.key) {
    return { delivered: false, provider: 'messagepro', error: 'MESSAGEPRO_SMS_KEY is not configured' };
  }

  const params = new URLSearchParams({
    key: cfg.key,
    from: serverEnv.smsFrom(),
    to: message.to,
    text: message.text,
  });

  const res = await fetch(`https://api-text.callpro.mn/v1/sms/send?${params.toString()}`);
  const text = await res.text();

  if (!res.ok) {
    return { delivered: false, provider: 'messagepro', error: `${res.status} ${text.slice(0, 200)}` };
  }

  return { delivered: true, provider: 'messagepro', id: text.slice(0, 120) };
}

async function sendViaCallpro(message: SmsMessage): Promise<DeliveryResult> {
  const cfg = serverEnv.callpro();
  if (!cfg.key) {
    return { delivered: false, provider: 'callpro', error: 'CALLPRO_SMS_KEY is not configured' };
  }

  const params = new URLSearchParams({
    key: cfg.key,
    from: serverEnv.smsFrom(),
    to: message.to,
    text: message.text,
  });

  const url = cfg.url || 'https://api-text.callpro.mn/v1/sms/send';
  const res = await fetch(`${url}?${params.toString()}`);
  const text = await res.text();

  if (!res.ok) {
    return { delivered: false, provider: 'callpro', error: `${res.status} ${text.slice(0, 200)}` };
  }

  return { delivered: true, provider: 'callpro', id: text.slice(0, 120) };
}

export async function sendSms(message: SmsMessage): Promise<DeliveryResult> {
  const provider = serverEnv.smsProvider();
  try {
    switch (provider) {
      case 'callpro':
        return await sendViaCallpro(message);
      case 'messagepro':
        return await sendViaMessagePro(message);
      case 'http':
        return await sendViaHttp(message);
      case 'twilio':
        return await sendViaTwilio(message);
      case 'console':
      case '':
        return await sendViaConsole(message);
      default:
        return { delivered: false, provider, error: `Unknown SMS_PROVIDER "${provider}"` };
    }
  } catch (err) {
    console.error('[sms] delivery failed', err);
    return { delivered: false, provider, error: (err as Error).message };
  }
}
