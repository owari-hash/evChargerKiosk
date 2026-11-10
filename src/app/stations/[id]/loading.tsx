import { getTranslations } from '@/lib/i18n';

/** Shaped like a station page: title row, stepper, then the charging card. */
export default async function Loading() {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6" role="status" aria-busy="true">
      <span className="sr-only">{d.errors.loading}</span>
      <div className="animate-pulse" aria-hidden>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-surface-muted" />
          <div className="h-7 flex-1 rounded-lg bg-surface-muted" />
          <div className="size-10 rounded-xl bg-surface-muted" />
          <div className="size-10 rounded-xl bg-surface-muted" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-24 rounded-full bg-surface-muted" />
          <div className="h-6 w-32 rounded-full bg-surface-muted" />
        </div>
        <div className="mt-6 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <div className="size-8 shrink-0 rounded-full bg-surface-muted" />
              <div className="h-1 flex-1 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-border">
          <div className="h-5 w-1/2 rounded-lg bg-surface-muted" />
          <div className="h-4 w-3/4 rounded-lg bg-surface-muted" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
