'use client';

import type { ReactNode } from 'react';
import { PainelShell } from '../components/PainelShell';
import { UserProvider } from '../../lib/user-context';

// O painel da instituição NÃO fica no grupo de rotas do aluno de propósito: a
// moldura de lá traz a barra de gamificação e o menu de estudo, que não fazem
// sentido para quem administra uma instituição.
export default function InstituicaoLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <PainelShell titulo="Painel da instituição" papeisPermitidos={['admin_instituicao', 'admin']}>
        {children}
      </PainelShell>
    </UserProvider>
  );
}
