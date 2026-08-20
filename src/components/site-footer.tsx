import Link from 'next/link';
import { publicEnv } from '@/lib/env';
import { format, getTranslations } from '@/lib/i18n';

export async function SiteFooter() {
  const { d } = await getTranslations();

  const links = [
    { href: '/stations', label: d.nav.stations },
    { href: '/pricing', label: d.nav.pricing },
    { href: '/help', label: d.nav.help },
    { href: '/legal/terms', label: d.footer.terms },
    { href: '/legal/privacy', label: d.footer.privacy },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {format(d.footer.rights, {
            year: new Date().getFullYear(),
            brand: publicEnv.brandName,
          })}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
