import { guard, HOUR, json, parseBody, route } from '@/lib/api';
import { phoneTaken, sendSmsCode, signupOwner } from '@/lib/auth/sms-code';
import { maskDestination } from '@/lib/auth/tokens';
import { getStore } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { templates } from '@/lib/notify';
import { signupSendCodeSchema } from '@/lib/validation';

/** Sign-up, step 1: text a code to the number being registered. */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:signup-send-code', 10, HOUR);
  const { phone } = await parseBody(req, signupSendCodeSchema);

  const store = await getStore();
  if (await store.findUserByPhone(phone)) throw phoneTaken();

  const code = await sendSmsCode(store, {
    owner: signupOwner(phone),
    kind: 'phone_verify',
    destination: phone,
    text: templates.signupSms,
  });

  return json({
    ok: true,
    destination: maskDestination(phone, 'sms'),
    ...(serverEnv.devExposeTokens() ? { devCode: code } : {}),
  });
});
