import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChargeCard } from '@/components/account/charge-card';
import { ProfileForm } from '@/components/account/profile-form';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentUser, toPublicUser } from '@/lib/auth/session';
import { getTranslations, type Dictionary } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { ensureChargeTag } from '@/lib/csms/charge-tag';

export const dynamic = 'force-dynamic';

const VERIFIED_TONE = 'bg-brand-soft text-brand-strong ring-brand/30';
const PENDING_TONE = 'bg-emerald-800 text-emerald-50 ring-emerald-950';

interface StatusRowProps {
  label: string;
  detail: string;
  verified: boolean;
  href: string;
  action: string;
  d: Dictionary;
}

function StatusRow({ label, detail, verified, href, action, d }: StatusRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 ring-1 ring-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm text-muted">{detail}</p>
        </div>
        <Badge tone={verified ? VERIFIED_TONE : PENDING_TONE} className="shrink-0">
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              verified ? 'bg-brand-strong' : 'bg-emerald-300',
            )}
          />
          {verified ? d.account.verified : d.account.notVerified}
        </Badge>
      </div>
      <Link
        href={href}
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-strong underline-offset-4 hover:underline"
      >
        {action}
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

export default async function AccountOverviewPage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (!user) redirect('/login');

  if (!user.idTag) {
    const idTag = await ensureChargeTag(user);
    if (idTag) user.idTag = idTag;
  }

  const publicUser = toPublicUser(user);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{d.account.statusTitle}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <StatusRow
            label={d.account.emailLabel}
            detail={publicUser.email}
            verified={publicUser.emailVerified}
            href="/account/security#email"
            action={publicUser.emailVerified ? d.account.manage : d.account.confirmEmail}
            d={d}
          />
          <StatusRow
            label={d.account.mobileLabel}
            detail={publicUser.phone ?? d.account.noNumberYet}
            verified={publicUser.phoneVerified}
            href="/account/security#phone"
            action={publicUser.phoneVerified ? d.account.manage : d.account.verifyNumber}
            d={d}
          />
        </CardBody>
      </Card>

      <ProfileForm user={publicUser} />
      <ChargeCard user={publicUser} />
    </>
  );
}
