import { getTranslations } from '@/lib/i18n';

export default async function Loading() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14" role="status" aria-busy="true">
      <span className="sr-only">{d.errors.loading}</span>

      <div className="animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-9 w-56 rounded-xl bg-surface-muted" />
          <div className="h-4 w-full max-w-md rounded-lg bg-surface-muted" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-surface p-5 ring-1 ring-border shadow-[var(--shadow-card)]"
            >
              <div className="h-4 w-2/3 rounded-lg bg-surface-muted" />
              <div className="mt-3 h-3 w-full rounded-lg bg-surface-muted" />
              <div className="mt-2 h-3 w-4/5 rounded-lg bg-surface-muted" />
              <div className="mt-5 h-9 w-28 rounded-xl bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
