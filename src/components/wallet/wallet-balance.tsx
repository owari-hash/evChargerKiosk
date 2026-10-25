import { Alert } from '@/components/ui';
import type { Wallet, WalletConfig } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/components/i18n-provider';
import { cn, formatMoney, intlLocale } from '@/lib/utils';

/**
 * The balance headline: a frosted glass card with the brand's light glowing
 * through it — what is available now on the left, lifetime totals on the right.
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
    <section className="space-y-3">
      <div data-slot="card" className="glass-hero relative overflow-hidden p-4 sm:p-6">
        {/* Light behind the frost — the glass takes its colour from these. */}
        <span
          aria-hidden
          className={cn(
            'glass-orb -left-10 -top-16 size-56',
            inDebt ? 'bg-[#ef4444]' : 'bg-[#10b981]',
          )}
        />
        <span
          aria-hidden
          className={cn('glass-orb -bottom-24 right-24 size-64', inDebt ? 'bg-[#f97316]' : 'bg-[#22d3ee]')}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {inDebt ? d.wallet.debt : d.wallet.balance}
            </p>
            <p
              className={cn(
                'mt-1 text-3xl sm:text-5xl font-bold tracking-tight tabular-nums break-words',
                inDebt ? 'text-danger' : 'text-foreground',
              )}
            >
              {money(Math.abs(wallet.balance))}
            </p>
            <p className="mt-1 text-sm text-muted">{inDebt ? d.wallet.debtHint : d.wallet.balanceHint}</p>
          </div>

          <dl className="glass-tile grid grid-cols-2 divide-x divide-white/10 rounded-2xl text-sm sm:min-w-64">
            <div className="px-2.5 sm:px-4 py-2 sm:py-3.5 min-w-0">
              <dt className="truncate text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-muted">{d.wallet.toppedUp}</dt>
              <dd className="mt-1 truncate text-sm sm:text-base font-bold tabular-nums text-foreground">
                {money(wallet.totalToppedUp ?? 0)}
              </dd>
            </div>
            <div className="px-2.5 sm:px-4 py-2 sm:py-3.5 min-w-0">
              <dt className="truncate text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-muted">{d.wallet.spent}</dt>
              <dd className="mt-1 truncate text-sm sm:text-base font-bold tabular-nums text-foreground">{money(wallet.totalSpent ?? 0)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {wallet.status === 'FROZEN' && <Alert tone="danger">{d.wallet.frozen}</Alert>}

      {low && config.requireBalanceToStart && (
        <Alert tone="warning">{format(d.wallet.lowBalance, { amount: money(config.minStartBalance) })}</Alert>
      )}
    </section>
  );
}
