import type { ReactNode } from 'react';

/**
 * Remounts on every account tab change, so the new tab's content settles in
 * while the sidebar highlight slides. Carries the layout's card spacing, since
 * it becomes the single child of that spaced container.
 */
export default function AccountTemplate({ children }: { children: ReactNode }) {
  return <div className="tab-enter space-y-6">{children}</div>;
}
