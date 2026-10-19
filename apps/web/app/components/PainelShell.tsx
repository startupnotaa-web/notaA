'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { ContextoDoPainelProvider } from '../../lib/contexto-do-painel';
import { useUser } from '../../lib/user-context';
import { SeletorDeContexto } from './SeletorDeContexto';
import { ShellDesktop, type ItemDeNavegacao } from './ShellDesktop';
import { TelaCarregando } from './TelaCarregando';

export type { ItemDeNavegacao } from './ShellDesktop';

/**
 * Moldura dos painéis administrativos (instituição e professor).
 *
 * Existe para que esses painéis NÃO herdem a moldura do aluno: aqui não há barra de gamificação,
 * nível, ofensiva nem selo de plano. A guarda de papel é de interface, não de autorização: o
 * servidor recusa por conta própria. Isto só evita uma tela vazia e confusa.
 *
 * É uma moldura de computador (ShellDesktop): SideNav fixa e recolhível, barra superior com busca
 * (Ctrl/Cmd+K), seletor de ano letivo e turma, atalhos e conta; só a área de trabalho rola. Sem
 * `navegacao` (painel do professor), a barra lateral não existe e a navegação inferior também não.
 */
export function PainelShell({
  titulo,
  papeisPermitidos,
  navegacao,
  children,
}: {
  titulo: string;
  papeisPermitidos: readonly string[];
  navegacao: readonly ItemDeNavegacao[];
  children: ReactNode;
}) {
  const { session, loading: authLoading, signOut } = useAuth();
  const { role, perfil, loading: userLoading } = useUser();
  const router = useRouter();

  const carregando = authLoading || userLoading;
  const autorizado = role !== null && papeisPermitidos.includes(role);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
      return;
    }
    if (!carregando && session && !autorizado) {
      router.replace('/dashboard');
    }
  }, [authLoading, carregando, session, autorizado, router]);

  if (carregando || !session) return <TelaCarregando />;
  if (!autorizado) return <TelaCarregando rotulo="Verificando permissões" />;

  return (
    <ContextoDoPainelProvider>
      <ShellDesktop
        itens={navegacao}
        rotuloDaNavegacao={titulo}
        contexto={<SeletorDeContexto />}
        nomeDaConta={perfil?.nome}
        emailDaConta={perfil?.email}
        aoSair={() => void signOut()}
      >
        <div className="mx-auto w-full max-w-pagina px-4 py-space-5 md:px-space-5 lg:px-space-6 lg:py-space-6">{children}</div>
      </ShellDesktop>
      <Toaster />
    </ContextoDoPainelProvider>
  );
}
