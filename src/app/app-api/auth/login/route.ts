import { ApiError, guard, json, MINUTE, parseBody, route, tooMany, unauthorized } from '@/lib/api';
import {
  clearedPinLock,
  dummyPinHash,
  failedPinPatch,
  pinLock,
  pinLockMessage,
  verifyPin,
} from '@/lib/auth/pin';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { loginSchema } from '@/lib/validation';

const GENERIC = 'Утасны дугаар эсвэл PIN код буруу байна';

export const POST = route(async (req: Request) => {
  guard(req, 'auth:login', 10, 15 * MINUTE);
  // The schema has already normalised the number to E.164.
  const { phone, pin } = await parseBody(req, loginSchema);

  const store = await getStore();
  const user = await store.findUserByPhone(phone);

  // Inactive accounts get the same wording so the endpoint reveals nothing.
  if (!user || !user.isActive) {
    await verifyPin(pin, await dummyPinHash());
    throw unauthorized(GENERIC);
  }

  const lock = pinLock(user);
  if (lock.kind !== 'none') throw tooMany(pinLockMessage(lock));

  // An account from before PIN sign-in: the SMS reset is how it gets one.
  if (!user.pinHash) {
    throw new ApiError(
      401,
      'Энэ бүртгэлд PIN код тохируулаагүй байна. «PIN код мартсан» дээр дарж SMS кодоор тохируулна уу.',
      { pin: 'PIN код тохируулаагүй байна' },
    );
  }

  if (!(await verifyPin(pin, user.pinHash))) {
    const failed = (await store.updateUser(user.id, failedPinPatch(user))) ?? user;
    const now = pinLock(failed);
    if (now.kind !== 'none') throw tooMany(pinLockMessage(now));
    throw unauthorized(GENERIC);
  }

  const updated =
    (await store.updateUser(user.id, {
      ...clearedPinLock,
      lastLoginAt: new Date().toISOString(),
    })) ?? user;

  await setSessionCookie(updated);

  return json({ user: toPublicUser(updated) });
});
