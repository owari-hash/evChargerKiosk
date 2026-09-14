import { AuthFormFallback } from '@/components/auth/auth-shell';

/** Shown inside the card the instant a switch is tapped, until the form arrives. */
export default function AuthLoading() {
  return (
    <div aria-busy className="space-y-7">
      <div className="space-y-3" aria-hidden>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-muted" />
      </div>
      <AuthFormFallback rows={2} />
    </div>
  );
}
