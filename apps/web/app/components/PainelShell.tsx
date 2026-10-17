'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav, Button, NotaASimbolo, SideNav } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';
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
 * O conteúdo fica limitado a 1.280px, com margem `space-7` (48px) no desktop.
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

  if (carregando || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-muted">Carregando…</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-muted">Verificando permissões…</p>
      </div>
    );
  }

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
            collapsible
            className="h-full"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-surface">
          <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 lg:px-12">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md font-display text-[17px] font-semibold text-ink no-underline ${itens ? 'md:hidden' : ''}`}
              >
                <NotaASimbolo className="h-6 w-auto" />
                Nota A
              </Link>
              <p className="m-0 font-text text-sm font-bold text-ink-muted">{titulo}</p>
            </div>
            <Button variant="quiet" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </header>
        <main id="conteudo" className="min-w-0 flex-1">
          <div className={`mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 lg:px-12 ${itens ? 'pb-24 md:pb-6' : ''}`}>
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
