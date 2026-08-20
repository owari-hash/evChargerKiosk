import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountNav } from '@/components/account/account-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { format, getTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.account.title };
}

export default async function AccountLayout({ children }: LayoutProps<'/account'>) {
  const [user, { d }] = await Promise.all([getCurrentUser(), getTranslations()]);
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {d.account.title}
        </h1>
        <p className="text-sm text-muted">{format(d.account.signedInAs, { email: user.email })}</p>
      </header>

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[14rem_1fr] md:gap-8">
        <AccountNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
