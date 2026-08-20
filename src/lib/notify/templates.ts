import { publicEnv } from '@/lib/env';

const brand = publicEnv.brandName;

function layout(title: string, body: string, cta?: { url: string; label: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#059669;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>
       <p style="color:#64748b;font-size:13px">If the button does not work, paste this link into your browser:<br><span style="word-break:break-all">${cta.url}</span></p>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:28px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="font-size:18px;font-weight:700;margin:0 0 24px">${brand}</p>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
    ${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="color:#94a3b8;font-size:12px;margin:0">You received this email because someone used this address at ${brand}. If it was not you, no action is needed.</p>
  </div></body></html>`;
}

export function passwordResetEmail(url: string, minutes: number) {
  return {
    subject: `Reset your ${brand} password`,
    text: `Reset your ${brand} password by opening this link within ${minutes} minutes:\n\n${url}\n\nIf you did not request a reset, ignore this email.`,
    html: layout(
      'Reset your password',
      `<p style="line-height:1.6;margin:0">We received a request to reset the password for your ${brand} account. The link below is valid for ${minutes} minutes.</p>`,
      { url, label: 'Choose a new password' },
    ),
  };
}

export function verifyEmail(url: string) {
  return {
    subject: `Confirm your ${brand} email address`,
    text: `Welcome to ${brand}. Confirm your email address by opening this link:\n\n${url}`,
    html: layout(
      'Confirm your email address',
      `<p style="line-height:1.6;margin:0">Thanks for creating a ${brand} account. Confirm your address so we can send you charging receipts and account notices.</p>`,
      { url, label: 'Confirm email' },
    ),
  };
}

export function welcomeEmail(name?: string) {
  return {
    subject: `Welcome to ${brand}`,
    text: `Hi${name ? ` ${name}` : ''}, your ${brand} account is ready. Find a charger and start a session from the app.`,
    html: layout(
      `Welcome${name ? `, ${name}` : ''}`,
      `<p style="line-height:1.6;margin:0">Your ${brand} account is ready. Find a nearby charger, check live availability, and keep every charging session in one place.</p>`,
    ),
  };
}

export function passwordResetSms(code: string, minutes: number): string {
  return `${brand}: your password reset code is ${code}. It expires in ${minutes} minutes. Do not share this code.`;
}

export function phoneVerifySms(code: string, minutes: number): string {
  return `${brand}: your verification code is ${code}. It expires in ${minutes} minutes.`;
}
