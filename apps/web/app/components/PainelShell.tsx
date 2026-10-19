'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav, Button, NotaASimbolo, SideNav } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';
import { AvisoOffline } from './AvisoOffline';
import { TelaCarregando } from './TelaCarregando';
import { Toaster } from './toast';

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
  /** Ícone de 20px. Aparece sozinho entre 768 e 1.023px e ao lado do rótulo na navegação inferior. */
  icone: ReactNode;
}

/**
 * Moldura dos painéis administrativos (instituição e professor).
 *
 * Existe para que esses painéis NÃO herdem a moldura do aluno. Antes o painel da
 * instituição vivia no grupo de rotas do estudante, então um diretor abria o
 * painel e via a própria barra de gamificação com nível, ofensiva e selo de
 * plano, mais o menu inferior de Trilha e Estudo. Aqui não há nada disso.
 *
 * A guarda de papel é de interface, não de autorização: o servidor recusa por
 * conta própria. Isto só evita que alguém veja uma tela vazia e confusa.
 *
 * Com `navegacao` (até 5 destinos), o layout é desktop-first:
 * - a partir de 1.024px, `SideNav` fixa de 248px à esquerda;
 * - entre 768 e 1.023px, a mesma barra recolhida só com ícones;
 * - abaixo de 768px, navegação inferior.
 * O conteúdo fica limitado a 1.280px, com margem `space-7` (48px) no desktop. O título da tela é o
 * h1 de cada página (PageHeader); a moldura só guarda a marca e o "Sair". Com SideNav, o "Sair" mora no
 * pé dela; abaixo de 768px (e no painel sem navegação) há uma barra fina no topo, sem borda.
 */
export function PainelShell({
  titulo,
  papeisPermitidos,
  navegacao,
  children,
}: {
  titulo: string;
  papeisPermitidos: readonly string[];
  navegacao?: readonly ItemDeNavegacao[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { session, loading: authLoading, signOut } = useAuth();
  const { role, loading: userLoading } = useUser();
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

  // A raiz do painel só fica ativa nela mesma; as demais, em subpáginas também.
  const atual = navegacao?.find((item) => {
    const raiz = navegacao[0]?.href === item.href;
    return raiz ? pathname === item.href : pathname.startsWith(item.href);
  })?.href;
  const itens = navegacao?.map((item) => ({ id: item.href, label: item.rotulo, href: item.href, icon: item.icone }));

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-primary"
      >
        Pular para o conteúdo
      </a>
      {itens ? (
        <div className="sticky top-0 hidden h-screen shrink-0 md:block">
          <SideNav
            items={itens}
            current={atual}
            label="Seções do painel"
            logo={<NotaASimbolo className="h-6 w-auto flex-none" />}
            linkAs={Link}
            footer={
              <Button variant="quiet" className="max-lg:px-0" onClick={() => void signOut()}>
                <LogOut aria-hidden="true" className="h-5 w-5 flex-none" />
                <span className="max-lg:sr-only">Sair</span>
              </Button>
            }
            collapsible
            className="h-full"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex min-h-[56px] items-center justify-between gap-4 px-4 lg:px-space-7 ${itens ? 'md:hidden' : ''}`}>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md font-display text-[17px] font-semibold text-ink no-underline"
            >
              <NotaASimbolo className="h-6 w-auto" />
              Nota A
            </Link>
            <p className="m-0 text-label text-ink-muted">{titulo}</p>
          </div>
          <Button variant="quiet" onClick={() => void signOut()}>
            Sair
          </Button>
        </header>
        <main id="conteudo" className="min-w-0 flex-1">
          <div className={`mx-auto w-full max-w-pagina px-4 py-space-5 md:px-space-6 lg:px-space-7 lg:py-space-6 ${itens ? 'pb-24 md:pb-space-6' : ''}`}>
            <AvisoOffline className="mb-space-5" />
            {children}
          </div>
        </main>
      </div>
      {itens ? (
        <div className="md:hidden">
          <BottomNav items={itens} current={atual} label="Seções do painel" linkAs={Link} />
        </div>
      ) : null}
      <Toaster />
    </div>
  );
}
