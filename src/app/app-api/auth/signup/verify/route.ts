import { guard, HOUR, json, parseBody, route } from '@/lib/api';
import { issuePhoneTicket } from '@/lib/auth/phone-ticket';
import { consumeSmsCode, invalidCode, phoneTaken, signupOwner } from '@/lib/auth/sms-code';
import { getStore } from '@/lib/db';
import { phoneCodeSchema } from '@/lib/validation';

/**
 * Sign-up, step 2: check the texted code. Nothing is created yet; the ticket
 * returned here is what step 3 exchanges for an account.
 */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:signup-verify', 20, HOUR);
  const { phone, code } = await parseBody(req, phoneCodeSchema);

  const store = await getStore();
  if (await store.findUserByPhone(phone)) throw phoneTaken();

  if (!(await consumeSmsCode(store, signupOwner(phone), 'phone_verify', code))) {
    throw invalidCode();
  }

  return json({ ok: true, signupTicket: await issuePhoneTicket('signup', { phone }) });
});
