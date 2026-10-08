import { Alert, Card, CardBody } from '@/components/ui';
import type { Wallet, WalletConfig } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/components/i18n-provider';
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
          <p className="mb-3 text-sm text-muted">{d.wallet.linkedTags}</p>
          {wallet.idTags && wallet.idTags.length > 0 ? (
            <ul className="space-y-2">
              {wallet.idTags.map((tag) => (
                <li
                  key={tag}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0 text-brand"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm14 6h.01" />
                  </svg>
                  <span className="truncate font-mono text-sm font-semibold tracking-wide text-foreground">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{d.wallet.noLinkedTags}</p>
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
