import { ApiError, guard, HOUR, json, parseBody, route } from '@/lib/api';
import { sendSmsCode } from '@/lib/auth/sms-code';
import { maskDestination } from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { templates } from '@/lib/notify';
import { pinForgotSchema } from '@/lib/validation';

const NOT_FOUND = 'Энэ дугаараар бүртгэл олдсонгүй';

/**
 * PIN reset, step 1: text a code to the account's number.
 *
 * Unlike the old password reset this says when a number is not registered —
 * sign-up already has to, so hiding it here would protect nothing.
 */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:pin-forgot', 5, HOUR);
  const { phone } = await parseBody(req, pinForgotSchema);

  const store = await getStore();
  const user = await store.findUserByPhone(phone);
  if (!user || !user.isActive) throw new ApiError(404, NOT_FOUND, { phone: NOT_FOUND });

  const code = await sendSmsCode(store, {
    owner: user.id,
    kind: 'password_reset',
    destination: phone,
    text: templates.pinResetSms,
  });

  return json({
    ok: true,
    destination: maskDestination(phone, 'sms'),
    ...(serverEnv.devExposeTokens() ? { devCode: code } : {}),
  });
});
