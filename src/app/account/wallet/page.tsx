import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopUpPanel } from '@/components/wallet/top-up-panel';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { WalletHistory } from '@/components/wallet/wallet-history';
import { Alert } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getWallet,
  getWalletConfig,
  listWalletEntries,
  type Wallet,
  type WalletConfig,
  type WalletEntry,
} from '@/lib/csms/wallet';
import { getTranslations } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Хэтэвч',
};

/** Never cache a balance — it changes the moment a session ends or a top-up lands. */
export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { locale, d } = await getTranslations();

  let wallet: Wallet | null = null;
  let config: WalletConfig | null = null;
  let entries: WalletEntry[] = [];
  let loadError = '';

  try {
    // The config read is what tells us whether the CSMS is reachable at all, so
    // a failure here means the whole screen falls back to the notice below.
    [wallet, config] = await Promise.all([getWallet(user.id), getWalletConfig()]);
    entries = (await listWalletEntries(user.id, { limit: 20 })).data;
  } catch (err) {
    console.error('[wallet] failed to load wallet', err);
    loadError = d.wallet.unavailable;
  }

  return (
    <>
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{d.wallet.title}</h2>
        <p className="text-sm text-muted">{d.wallet.subtitle}</p>
      </header>

      {loadError || !wallet || !config ? (
        <Alert tone="danger" title={d.common.somethingWentWrong}>
          {loadError || d.wallet.unavailable}
        </Alert>
      ) : (
        <>
          <WalletBalance wallet={wallet} config={config} d={d} locale={locale} />
          <TopUpPanel config={config} />
          <WalletHistory entries={entries} d={d} locale={locale} />
        </>
      )}
    </>
  );
}
