import { z } from 'zod';
import { HOUR, MINUTE, badRequest, guard, json, parseBody, requireUser, route } from '@/lib/api';
import { createTopUp, getTopUpQr, getWalletConfig } from '@/lib/csms/wallet';

/**
 * Start a QPay top-up: creates the invoice in the CSMS and returns the QR the
 * driver scans. No money moves here — the balance changes only when QPay
 * confirms the payment, which `/app-api/wallet/topup/[id]` polls for.
 */

const bodySchema = z.object({
  amount: z
    .number({ message: 'Дүнгээ оруулна уу' })
    .int('Дүн бүхэл тоо байх ёстой')
    .positive('Дүн 0-ээс их байх ёстой'),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  // An unpaid invoice costs QPay a request each; keep one driver from opening
  // dozens of them in a row.
  guard(req, 'wallet-topup', 12, 10 * MINUTE);
  guard(req, 'wallet-topup-hourly', 40, HOUR);

  const { amount } = await parseBody(req, bodySchema);
  const config = await getWalletConfig();

  if (!config.enabled || !config.topUpEnabled) {
    throw badRequest('Цэнэглэх үйлчилгээ түр боломжгүй байна. Дараа дахин оролдоно уу.');
  }
  if (amount < config.minTopUp || amount > config.maxTopUp) {
    throw badRequest(
      `Цэнэглэх дүн ${config.minTopUp.toLocaleString('mn-MN')}₮ – ${config.maxTopUp.toLocaleString(
        'mn-MN',
      )}₮ хооронд байх ёстой`,
      { amount: 'Дүн зөвшөөрөгдөх хязгаараас гадуур байна' },
    );
  }

  const invoice = await createTopUp({
    userId: user.id,
    amount,
    description: `Хэтэвч цэнэглэлт — ${amount.toLocaleString('mn-MN')}₮`,
    receiverCode: user.phone || user.email,
  });

  // The QR image lives behind its own endpoint because of its size; fetch it
  // once here so the client gets a ready-to-render invoice in one round trip.
  const qr = await getTopUpQr(invoice.id).catch(() => null);

  return json({
    invoice: {
      ...invoice,
      qrText: qr?.qrText ?? invoice.qrText,
      qrImage: qr?.qrImage,
      shortUrl: qr?.shortUrl ?? invoice.shortUrl,
      deeplinks: qr?.deeplinks ?? invoice.deeplinks,
    },
  });
});
