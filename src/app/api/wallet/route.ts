import { json, requireUser, route } from '@/lib/api';
import { getWallet, getWalletConfig, listWalletEntries } from '@/lib/csms/wallet';

/**
 * The signed-in driver's wallet, its ledger and the top-up settings.
 *
 * The account id comes from the session cookie and never from the request, so a
 * driver can only ever read their own balance.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 10);

  const [wallet, config, entries] = await Promise.all([
    getWallet(user.id),
    getWalletConfig(),
    listWalletEntries(user.id, { limit: Number.isFinite(limit) ? Math.min(limit, 50) : 10 }),
  ]);

  return json({ wallet, config, entries: entries.data, total: entries.total });
});
