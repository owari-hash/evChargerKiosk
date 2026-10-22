import Link from 'next/link';
import { publicEnv } from '@/lib/env';
import { format, getTranslations } from '@/lib/i18n';

export async function SiteFooter() {
  const { d } = await getTranslations();

  const links = [
    { href: '/pricing', label: d.nav.pricing },
    { href: '/help', label: d.nav.help },
    { href: '/download', label: d.nav.download },
    { href: '/legal/terms', label: d.footer.terms },
    { href: '/legal/privacy', label: d.footer.privacy },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <p className="order-2 text-center text-xs text-muted sm:order-1 sm:text-left sm:text-sm">
          {format(d.footer.rights, {
            year: new Date().getFullYear(),
            brand: publicEnv.brandName,
          })}
        </p>
        <nav className="order-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:order-2">
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
