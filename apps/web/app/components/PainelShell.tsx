'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Papel } from '@notaa/contracts';
import { Toaster } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { ContextoDoPainelProvider } from '../../lib/contexto-do-painel';
import { useGuardaDePapel } from '../../lib/guarda-de-papel';
import { useUser } from '../../lib/user-context';
import { AcessoNegado, IrParaConcluirCadastro } from './AcessoNegado';
import { SeletorDeContexto } from './SeletorDeContexto';
import { SeletorDePerfil } from './SeletorDePerfil';
import { ShellDesktop, type ItemDeNavegacao } from './ShellDesktop';
import { TelaCarregando } from './TelaCarregando';

export type { ItemDeNavegacao } from './ShellDesktop';

/**
 * Moldura dos painéis administrativos (instituição e professor).
 *
 * Existe para que esses painéis NÃO herdem a moldura do aluno: aqui não há barra de gamificação,
 * nível, ofensiva nem selo de plano. A guarda de papel é de interface, não de autorização: o
 * servidor recusa por conta própria. Isto só evita uma tela vazia e confusa. O papel vem do token;
 * uma falha de `GET /me` nunca vira "papel errado", e quem é de outro perfil vê `AcessoNegado` em
 * vez de ser jogado no painel do aluno.
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
  papeisPermitidos: readonly Papel[];
  navegacao: readonly ItemDeNavegacao[];
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const { perfil, loading: userLoading } = useUser();
  const guarda = useGuardaDePapel(papeisPermitidos);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (guarda.estado === 'sem-sessao') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [guarda.estado, pathname, router]);

  if (guarda.estado === 'carregando' || guarda.estado === 'sem-sessao') return <TelaCarregando />;
  if (guarda.estado === 'sem-papel') return <IrParaConcluirCadastro />;
  if (guarda.estado === 'negado') return <AcessoNegado papel={guarda.papel} />;
  if (userLoading) return <TelaCarregando rotulo="Carregando o painel" />;

  return (
    <ContextoDoPainelProvider>
      <ShellDesktop
        itens={navegacao}
        rotuloDaNavegacao={titulo}
        contexto={
          <>
            <SeletorDePerfil />
            <SeletorDeContexto />
          </>
        }
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
