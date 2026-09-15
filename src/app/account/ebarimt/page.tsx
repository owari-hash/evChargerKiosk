import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EbarimtHistoryTable } from '@/components/account/ebarimt-history-table';
import { getCurrentUser, getWallet, listSessions } from '@/lib/driver-api';
import { getTranslations } from '@/lib/i18n';
import type { ChargingSession, WalletEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.account.ebarimt.metaTitle };
}

export default async function AccountEbarimtPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Either half failing still shows the other: receipts come from both the
  // charging sessions and the wallet ledger.
  const [sessions, walletEntries] = await Promise.all([
    user.idTag ? listSessions(100).catch((): ChargingSession[] => []) : [],
    getWallet(100)
      .then((load) => load.entries)
      .catch((): WalletEntry[] => []),
  ]);

  return <EbarimtHistoryTable walletEntries={walletEntries} sessions={sessions} />;
}
