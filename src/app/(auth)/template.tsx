import type { ReactNode } from 'react';

/** Remounts per page, so the incoming form settles in as the switch slides. */
export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <div className="tab-enter">{children}</div>;
}
