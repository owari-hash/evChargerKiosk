import { z } from 'zod';
import { serverEnv } from '@/lib/env';

/**
 * Turns typed local input into E.164 (`+97699112233`). Anything already prefixed
 * with `+` is kept as-is; a leading `00` or a bare national number is expanded
 * with DEFAULT_COUNTRY_CODE.
 */
export function normalizePhone(raw: string, countryCode?: string): string | null {
  const cc = (countryCode ?? serverEnv.defaultCountryCode()).replace(/\D/g, '');
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[\s()\-.]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!digits.startsWith(cc)) digits = `${cc}${digits}`;

  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .email('Enter a valid email address')
  .transform((v) => v.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20)
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'That password is too long')
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), {
    message: 'Include at least one letter and one number',
  });

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Tell us your name').max(80),
    email: emailSchema,
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'Please accept the terms to continue' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean().optional(),
});

/** Forgot-password accepts either an email address or a phone number. */
export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number').max(200),
  channel: z.enum(['auto', 'email', 'sms']).default('auto'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    phone: z.string().trim().max(20).optional(),
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code').optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => Boolean(v.token) || (Boolean(v.phone) && Boolean(v.code)), {
    message: 'A reset link token or a phone number with its code is required',
    path: ['token'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  locale: z.enum(['en', 'mn']).optional(),
});

export const verifyPhoneSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const stationQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'available', 'busy', 'offline']).default('all'),
  connectorType: z.string().trim().max(20).optional(),
  minPowerKw: z.coerce.number().min(0).max(1000).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ field: firstMessage }` for form rendering. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    out[key] ??= issue.message;
  }
  return out;
}
