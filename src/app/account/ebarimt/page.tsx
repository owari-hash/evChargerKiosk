import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EbarimtHistoryTable } from '@/components/account/ebarimt-history-table';
import { Alert } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { decorateSessions, listSessionsForIdTags } from '@/lib/csms/stations';
import { listWalletEntries } from '@/lib/csms/wallet';
import { getTranslations } from '@/lib/i18n';
import type { ChargingSession } from '@/lib/types';
import type { WalletEntry } from '@/lib/csms/wallet';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'И-Баримтын түүх' };
}

export default async function AccountEbarimtPage() {
  const [user, { d, locale }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (!user) redirect('/login');

  let sessions: ChargingSession[] = [];
  let walletEntries: WalletEntry[] = [];
  let unavailable = false;

  try {
    const [sessRes, walletRes] = await Promise.all([
      user.idTag ? listSessionsForIdTags(user.idTag, 100).catch(() => []) : [],
      listWalletEntries(user.id, { limit: 100 }).catch(() => ({ data: [] })),
    ]);

    sessions = await decorateSessions(sessRes);
    walletEntries = walletRes.data || [];
  } catch (err) {
    console.warn('[account/ebarimt] could not load history', (err as Error).message);
    unavailable = true;
  }

  if (unavailable) {
    return (
      <Alert tone="warning" title="Мэдээлэл татахад алдаа гарлаа">
        И-Баримтын мэдээлэл татахад алдаа гарлаа. Та дараа дахин оролдоно уу.
      </Alert>
    );
  }

  return (
    <EbarimtHistoryTable
      walletEntries={walletEntries}
      sessions={sessions}
      locale={locale}
    />
  );
}
