import { Alert, Badge, Card, CardBody } from '@/components/ui';
import type { Wallet, WalletConfig } from '@/lib/csms/wallet';
import type { Dictionary } from '@/lib/i18n';
import { format } from '@/lib/i18n';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

/**
 * The balance headline.
 *
 * A negative balance is shown as a debt rather than a minus sign: a session may
 * cost more than the wallet held, and "you owe 2,300₮" reads far better at a
 * charger than "-2,300₮".
 */

interface WalletBalanceProps {
  wallet: Wallet;
  config: WalletConfig;
  d: Dictionary;
  locale: string;
}

export function WalletBalance({ wallet, config, d, locale }: WalletBalanceProps) {
  const intl = intlLocale(locale);
  const money = (value: number) => formatMoney(value, intl);
  const inDebt = wallet.balance < 0;
  const low = !inDebt && wallet.balance < config.minStartBalance;

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <p className="text-sm text-muted">{inDebt ? d.wallet.debt : d.wallet.balance}</p>
          <p
            className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${
              inDebt ? 'text-danger' : 'text-foreground'
            }`}
          >
            {money(Math.abs(wallet.balance))}
          </p>
          <p className="mt-1 text-sm text-muted">
            {inDebt ? d.wallet.debtHint : d.wallet.balanceHint}
          </p>
        </div>

        {wallet.status === 'FROZEN' && <Alert tone="danger">{d.wallet.frozen}</Alert>}

        {low && config.requireBalanceToStart && (
          <Alert tone="warning">
            {format(d.wallet.lowBalance, { amount: money(config.minStartBalance) })}
          </Alert>
        )}

        <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <dt className="text-muted">{d.wallet.toppedUp}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
              {money(wallet.totalToppedUp ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{d.wallet.spent}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
              {money(wallet.totalSpent ?? 0)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted">{d.wallet.linkedTags}</p>
          {wallet.idTags && wallet.idTags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {wallet.idTags.map((tag) => (
                <li key={tag}>
                  <Badge className="font-mono">{tag}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{d.wallet.noLinkedTags}</p>
          )}
        </div>

        {wallet.lastTopUpAt && (
          <p className="text-xs text-muted">
            {d.wallet.history.type.TOPUP} · {formatDateTime(wallet.lastTopUpAt, intl)}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
