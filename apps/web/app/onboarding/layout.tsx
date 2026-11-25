'use client';

import type { ReactNode } from 'react';
import { UserProvider } from '../../lib/auth/user-context';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
