'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AcessoNegado, IrParaConcluirCadastro } from '../components/acesso/AcessoNegado';
import { AppShell } from '../components/estrutura/AppShell';
import { TelaCarregando } from '../components/feedback/TelaCarregando';
import { Toaster } from '../components/feedback/toast';
import { papeisDaRota } from '../../lib/auth/destino';
import { useGuardaDePapel } from '../../lib/acesso/guarda-de-papel';
import { UserProvider } from '../../lib/auth/user-context';

export default function EstudanteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Cada rota do grupo tem os papéis dela em lib/auth/destino.ts (a maioria é só do aluno; /perfil é de
  // todos). Rota que não está no mapa não abre para ninguém.
  const guarda = useGuardaDePapel(papeisDaRota(pathname));
  const router = useRouter();

  useEffect(() => {
    if (guarda.estado === 'sem-sessao') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [guarda.estado, pathname, router]);

  if (guarda.estado === 'carregando' || guarda.estado === 'sem-sessao') return <TelaCarregando />;
  if (guarda.estado === 'sem-papel') return <IrParaConcluirCadastro />;
  if (guarda.estado === 'negado') return <AcessoNegado papel={guarda.papel} />;

  return (
    <UserProvider>
      <AppShell>
        {children}
        <Toaster />
      </AppShell>
    </UserProvider>
  );
}
