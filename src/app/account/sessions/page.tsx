import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SessionsTable } from '@/components/account/sessions-table';
import { Alert } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { decorateSessions, listSessionsForIdTags } from '@/lib/csms/stations';
import { getTranslations } from '@/lib/i18n';
import type { ChargingSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.account.sessions.title };
}

export default async function AccountSessionsPage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
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
      <Alert tone="warning" title={d.account.sessions.unavailable}>
        {d.account.sessions.unavailableBody}
      </Alert>
    );
  }

  return <SessionsTable sessions={sessions} />;
}
