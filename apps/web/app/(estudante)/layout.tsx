'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import { TelaCarregando } from '../components/TelaCarregando';
import { Toaster } from '../components/toast';
import { useAuth } from '../../lib/auth-context';
import { UserProvider } from '../../lib/user-context';

export default function EstudanteLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading || !session) {
    return <TelaCarregando />;
  }

  return (
    <UserProvider>
      <AppShell>
        {children}
        <Toaster />
      </AppShell>
    </UserProvider>
  );
}
