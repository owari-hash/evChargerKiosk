import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/account/profile-form';
import { getCurrentUser } from '@/lib/driver-api';

export const dynamic = 'force-dynamic';

/** Info and security used to be separate tabs; a driver managing one of their
 * details almost always wants the other in the same glance, so they're one
 * page now. PIN change lives in a modal ProfileForm opens, not inline here. */
export default async function AccountOverviewPage() {
  const publicUser = await getCurrentUser();
  if (!publicUser) redirect('/login');

  return (
    <>
      {/* The charge tag is the system's identifier for the driver; it is
          issued with the account and drivers never need to see it. */}
      <ProfileForm user={publicUser} />
    </>
  );
}
