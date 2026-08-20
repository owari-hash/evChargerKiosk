import { MINUTE, forbidden, guard, json, notFound, requireUser, route } from '@/lib/api';
import { checkTopUp, getTopUp, getWallet } from '@/lib/csms/wallet';

/**
 * Poll one top-up while the driver has the QR on screen.
 *
 * Ownership is checked before QPay is contacted: the invoice is read from the
 * CSMS first and must belong to this account's wallet. Without that step any
 * signed-in driver could force a QPay lookup on an invoice id they guessed.
 */
export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  // The client polls every few seconds; this bounds it at roughly one call per
  // second per driver even if a tab is left open.
  guard(req, 'wallet-topup-check', 90, 2 * MINUTE);

  const existing = await getTopUp(id).catch(() => null);
  if (!existing) throw notFound('Нэхэмжлэх олдсонгүй');
  if (existing.purpose !== 'WALLET_TOPUP' || existing.walletOwnerId !== user.id) {
    throw forbidden('Энэ нэхэмжлэх таных биш байна');
  }

  // Settled invoices need no further QPay round trip.
  const invoice = existing.status === 'PAID' ? existing : await checkTopUp(id);
  const paid = invoice.status === 'PAID';

  return json({
    invoice,
    paid,
    // Send the fresh balance along, so a paid QR can update the screen in one step.
    wallet: paid ? await getWallet(user.id).catch(() => null) : null,
  });
});
