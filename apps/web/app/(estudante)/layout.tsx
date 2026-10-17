'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p role="status" className="text-ink-muted">Carregando…</p>
      </main>
    );
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
