'use client';

import type { ReactNode } from 'react';
import { PainelShell } from '../components/PainelShell';
import { UserProvider } from '../../lib/user-context';

// Antes este grupo não tinha layout nenhum: a tela do professor renderizava sem
// guarda de sessão, e qualquer pessoa que abrisse a URL via a casca dela. Os
// dados nunca vazaram (o servidor recusa), mas a tela não deveria aparecer.
export default function ProfessorLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <PainelShell
        titulo="Painel do professor"
        papeisPermitidos={['professor_institucional', 'professor_independente', 'admin']}
      >
        {children}
      </PainelShell>
    </UserProvider>
  );
}
