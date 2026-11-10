import { getTranslations } from '@/lib/i18n';

/** Shaped like the finder: search panel, then a grid of station cards. */
export default async function Loading() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8" role="status" aria-busy="true">
      <span className="sr-only">{d.errors.loading}</span>
      <div className="animate-pulse space-y-5" aria-hidden>
        <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-border sm:p-4">
          <div className="flex gap-2">
            <div className="h-11 flex-1 rounded-xl bg-surface-muted" />
            <div className="size-11 rounded-xl bg-surface-muted" />
            <div className="h-11 w-28 rounded-xl bg-surface-muted" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="h-11 rounded-xl bg-surface-muted sm:w-[22rem]" />
            <div className="h-11 flex-1 rounded-xl bg-surface-muted" />
            <div className="h-11 flex-1 rounded-xl bg-surface-muted" />
          </div>
        </div>
        <div className="h-4 w-32 rounded-lg bg-surface-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-border shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-2/3 rounded-lg bg-surface-muted" />
                <div className="size-9 rounded-xl bg-surface-muted" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-surface-muted" />
                <div className="h-6 w-14 rounded-full bg-surface-muted" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-12 rounded-xl bg-surface-muted" />
                <div className="h-12 rounded-xl bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
