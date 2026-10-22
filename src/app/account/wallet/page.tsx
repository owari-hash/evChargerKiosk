import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopUpPanel } from '@/components/wallet/top-up-panel';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { WalletHistory } from '@/components/wallet/wallet-history';
import { Alert } from '@/components/ui';
import { getCurrentUser, getTopUp, getWallet } from '@/lib/driver-api';
import { getTranslations } from '@/lib/i18n';
import type { SavedCard, Wallet, WalletConfig, WalletEntry } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.account.nav.wallet };
}

/** Never cache a balance — it changes the moment a session ends or a top-up lands. */
export const dynamic = 'force-dynamic';

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { locale, d } = await getTranslations();
  // Set by the bank's card page when it sends the driver back.
  const { topup } = await searchParams;
  const returnedLoad =
    typeof topup === 'string' && /^[a-f0-9]{24}$/i.test(topup) ? await getTopUp(topup) : null;
  const returned = returnedLoad
    ? {
        invoice: returnedLoad.invoice,
        paid: returnedLoad.paid,
        balance: returnedLoad.wallet?.balance ?? null,
      }
    : undefined;

  let wallet: Wallet | null = null;
  let config: WalletConfig | null = null;
  let entries: WalletEntry[] = [];
  let cards: SavedCard[] = [];
  let loadError = '';

  try {
    ({ wallet, config, entries, cards = [] } = await getWallet(20));
  } catch (err) {
    // An unreachable API falls back to the notice below rather than an error page.
    console.error('[wallet] failed to load wallet', err);
    loadError = d.wallet.unavailable;
  }

  return (
    <>
      {loadError || !wallet || !config ? (
        <Alert tone="danger" title={d.common.somethingWentWrong}>
          {loadError || d.wallet.unavailable}
        </Alert>
      ) : (
        <>
          <WalletBalance wallet={wallet} config={config} d={d} locale={locale} />
          {/* Side by side when there is room: pay on the left, see it land on the right. */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <TopUpPanel config={config} returned={returned} cards={cards} />
            <WalletHistory entries={entries} d={d} locale={locale} />
          </div>
        </>
      )}
    </>
  );
}
