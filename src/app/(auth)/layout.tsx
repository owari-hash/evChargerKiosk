import type { ReactNode } from 'react';
import { AuthFrame } from '@/components/auth/auth-layout';

/** Sign-in, sign-up and PIN reset share one frame, kept across page switches. */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
