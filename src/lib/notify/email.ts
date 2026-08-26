import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serverEnv } from '@/lib/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    cid?: string;
  }>;
}

export interface DeliveryResult {
  delivered: boolean;
  provider: string;
  id?: string;
  error?: string;
}

/**
 * Writes the message to the server log and to .data/outbox.log instead of sending
 * it. This is the default so the app runs with no mail credentials configured.
 */
async function sendViaConsole(message: EmailMessage): Promise<DeliveryResult> {
  const line =
    `\n=== EMAIL ${new Date().toISOString()} ===\n` +
    `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`;
  console.info(line);
  try {
    const dir = path.join(process.cwd(), '.data');
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, 'outbox.log'), line, 'utf8');
  } catch {
    // The console output is the source of truth; a failed file write is not fatal.
  }
  return { delivered: true, provider: 'console' };
}

async function sendViaSmtp(message: EmailMessage): Promise<DeliveryResult> {
  const cfg = serverEnv.smtp();
  if (!cfg.host) {
    return { delivered: false, provider: 'smtp', error: 'SMTP_HOST is not configured' };
  }

  // Imported lazily so the SMTP client is not bundled unless it is actually used.
  const nodemailer = (await import('nodemailer')).default;
  const transportOptions = {
    pool: cfg.pool,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    tls: {
      rejectUnauthorized: cfg.rejectUnauthorized,
    },
  };
  const transport = nodemailer.createTransport(transportOptions as any);

  const info = await transport.sendMail({
    from: serverEnv.emailFrom(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
  });

  return { delivered: true, provider: 'smtp', id: info.messageId };
}

export async function sendEmail(message: EmailMessage): Promise<DeliveryResult> {
  const provider = serverEnv.emailProvider();
  try {
    switch (provider) {
      case 'smtp':
        return await sendViaSmtp(message);
      case 'console':
      case '':
        return await sendViaConsole(message);
      default:
        // Add further providers (Resend, SES, SendGrid) as extra cases here.
        return {
          delivered: false,
          provider,
          error: `Unknown EMAIL_PROVIDER "${provider}"`,
        };
    }
  } catch (err) {
    console.error('[email] delivery failed', err);
    return { delivered: false, provider, error: (err as Error).message };
  }
}
