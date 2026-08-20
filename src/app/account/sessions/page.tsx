import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SessionsTable } from '@/components/account/sessions-table';
import { Alert } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { decorateSessions, listSessionsForIdTags } from '@/lib/csms/stations';
import type { ChargingSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Charging history',
};

export default async function AccountSessionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let sessions: ChargingSession[] = [];
  let unavailable = false;

  try {
    sessions = await decorateSessions(await listSessionsForIdTags(user.idTags ?? []));
  } catch (err) {
    // A charging network outage must not take the whole account area down.
    console.warn('[account/sessions] could not load history', (err as Error).message);
    unavailable = true;
  }

  if (unavailable) {
    return (
      <Alert tone="warning" title="Charging history is unavailable">
        We could not reach the charging network just now, so your sessions are not shown. Please try
        again in a few minutes.
      </Alert>
    );
  }

  return <SessionsTable sessions={sessions} />;
}
