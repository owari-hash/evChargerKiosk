import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IdTagManager } from '@/components/account/id-tag-manager';
import { ProfileForm } from '@/components/account/profile-form';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentUser, toPublicUser } from '@/lib/auth/session';
import { getDictionary, getTranslations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const VERIFIED_TONE = 'bg-brand-soft text-brand-strong ring-brand/30';
const PENDING_TONE = 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300';

interface StatusRowProps {
  label: string;
  detail: string;
  verified: boolean;
  href: string;
  action: string;
}

function StatusRow({ label, detail, verified, href, action }: StatusRowProps) {
  const d = getDictionary('mn');

  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm text-muted">{detail}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge tone={verified ? VERIFIED_TONE : PENDING_TONE}>
          {verified ? d.account.verified : d.account.notVerified}
        </Badge>
        <Link
          href={href}
          className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          {action}
        </Link>
      </div>
    </div>
  );
}

export default async function AccountOverviewPage() {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (!user) redirect('/login');

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
          />
          <StatusRow
            label={d.account.mobileLabel}
            detail={publicUser.phone ?? d.account.noNumberYet}
            verified={publicUser.phoneVerified}
            href="/account/security#phone"
            action={publicUser.phoneVerified ? d.account.manage : d.account.verifyNumber}
          />
        </CardBody>
      </Card>

      <ProfileForm user={publicUser} />
      <IdTagManager user={publicUser} />
    </>
  );
}
