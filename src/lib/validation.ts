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
  .email('Зөв и-мэйл хаяг оруулна уу')
  .transform((v) => v.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Зөв утасны дугаар оруулна уу')
  .max(20)
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Зөв утасны дугаар оруулна уу' });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(8, 'Дор хаяж 8 тэмдэгт ашиглана уу')
  .max(128, 'Энэ нууц үг хэт урт байна')
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), {
    message: 'Дор хаяж нэг үсэг, нэг тоо оруулна уу',
  });

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Нэрээ оруулна уу').max(80),
    email: emailSchema,
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'Үргэлжлүүлэхийн тулд нөхцөлийг зөвшөөрнө үү' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirmPassword'],
  });

/**
 * Login accepts either an email address or a phone number, resolved the same way
 * as forgot-password. `email` stays accepted so the web form, which only ever
 * collects an address, keeps validating against this schema unchanged; the
 * mobile app sends `identifier`. Either way the parsed output is one normalised
 * `identifier` the route can dispatch on.
 */
export const loginSchema = z
  .object({
    email: z.string().trim().max(200).optional(),
    identifier: z.string().trim().max(200).optional(),
    password: z.string().min(1, 'Нууц үгээ оруулна уу'),
    remember: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const path = v.identifier !== undefined ? 'identifier' : 'email';
    const raw = (v.identifier ?? v.email ?? '').trim();

    if (!raw) {
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: 'И-мэйл хаяг эсвэл утасны дугаараа оруулна уу',
      });
      return;
    }
    if (raw.includes('@')) {
      if (!emailSchema.safeParse(raw).success) {
        ctx.addIssue({ code: 'custom', path: [path], message: 'Зөв и-мэйл хаяг оруулна уу' });
      }
      return;
    }
    if (!normalizePhone(raw)) {
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: 'Зөв и-мэйл хаяг эсвэл утасны дугаар оруулна уу',
      });
    }
  })
  .transform((v) => {
    const raw = (v.identifier ?? v.email ?? '').trim();
    return {
      identifier: raw.includes('@') ? raw.toLowerCase() : (normalizePhone(raw) ?? raw),
      password: v.password,
      remember: v.remember,
    };
  });

/** Forgot-password accepts either an email address or a phone number. */
export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'И-мэйл хаяг эсвэл утасны дугаараа оруулна уу').max(200),
  channel: z.enum(['auto', 'email', 'sms']).default('auto'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    phone: z.string().trim().max(20).optional(),
    code: z.string().trim().regex(/^\d{6}$/, '6 оронтой кодоо оруулна уу').optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirmPassword'],
  })
  .refine((v) => Boolean(v.token) || (Boolean(v.phone) && Boolean(v.code)), {
    message: 'Сэргээх холбоосын код эсвэл утасны дугаар, түүний код шаардлагатай',
    path: ['token'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Одоогийн нууц үгээ оруулна уу'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  locale: z.enum(['en', 'mn']).optional(),
});

export const verifyPhoneSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '6 оронтой кодоо оруулна уу'),
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
