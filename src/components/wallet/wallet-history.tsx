import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import type { WalletEntry } from '@/lib/csms/wallet';
import type { Dictionary } from '@/lib/i18n';
import { format } from '@/lib/i18n';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

/** The wallet ledger: what came in, what went out, and the balance after each. */

interface WalletHistoryProps {
  entries: WalletEntry[];
  d: Dictionary;
  locale: string;
}

export function WalletHistory({ entries, d, locale }: WalletHistoryProps) {
  const intl = intlLocale(locale);
  const money = (value: number) => formatMoney(value, intl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.wallet.history.title}</CardTitle>
      </CardHeader>
      <CardBody className="px-0 py-0">
        {entries.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{d.wallet.history.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const credit = entry.amount > 0;
              return (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.description || d.wallet.history.type[entry.type]}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {d.wallet.history.type[entry.type]} ·{' '}
                      {formatDateTime(entry.createdAt, intl)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        credit ? 'text-brand-strong' : 'text-foreground'
                      }`}
                    >
                      {credit ? '+' : '−'}
                      {money(Math.abs(entry.amount))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted tabular-nums">
                      {format(d.wallet.history.balanceAfter, {
                        balance: money(entry.balanceAfter),
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
