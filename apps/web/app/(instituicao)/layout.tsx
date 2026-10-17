'use client';

import type { ReactNode } from 'react';
import { FileSpreadsheet, LayoutDashboard, Settings } from 'lucide-react';
import { PainelShell, type ItemDeNavegacao } from '../components/PainelShell';
import { UserProvider } from '../../lib/user-context';

// O painel da instituição NÃO fica no grupo de rotas do aluno de propósito: a
// moldura de lá traz a barra de gamificação e o menu de estudo, que não fazem
// sentido para quem administra uma instituição.
const NAVEGACAO: ItemDeNavegacao[] = [
  { href: '/instituicao', rotulo: 'Painel', icone: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/instituicao/academico', rotulo: 'Configuração acadêmica', icone: <Settings className="h-5 w-5" /> },
  { href: '/instituicao/importacao', rotulo: 'Importação e exportação', icone: <FileSpreadsheet className="h-5 w-5" /> },
];

export default function InstituicaoLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <PainelShell
        titulo="Painel da instituição"
        papeisPermitidos={['admin_instituicao', 'admin']}
        navegacao={NAVEGACAO}
      >
        {children}
      </PainelShell>
    </UserProvider>
  );
}
