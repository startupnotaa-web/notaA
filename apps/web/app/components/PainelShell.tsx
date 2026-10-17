'use client';

import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, cn } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';
import { Toaster } from './toast';

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
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
 * Com `navegacao`, ganha barra lateral fixa no desktop (o painel da instituição
 * é de uso em computador) e, abaixo de `lg`, a mesma lista vira uma faixa
 * rolável sob o cabeçalho.
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Carregando…</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Verificando permissões…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Nota A" className="flex items-center rounded-md">
              <Image src="/brand/logo-full.png" alt="Nota A" width={46} height={30} priority />
            </Link>
            <span className="text-sm font-bold uppercase tracking-wider text-text-muted">
              {titulo}
            </span>
          </div>
          <Button variant="quiet" size="sm" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </header>
      {navegacao ? (
        <div className="flex flex-1 flex-col lg:flex-row">
          <nav
            aria-label="Seções do painel"
            className="border-b border-border bg-surface lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r"
          >
            <ul className="flex gap-1 overflow-x-auto px-4 py-2 lg:sticky lg:top-14 lg:flex-col lg:overflow-visible lg:px-3 lg:py-6">
              {navegacao.map((item) => {
                // A raiz do painel só fica ativa nela mesma; as demais, em subpáginas também.
                const raiz = navegacao[0]?.href === item.href;
                const ativo = raiz ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[44px] items-center whitespace-nowrap rounded-md border-b-2 px-3 text-sm font-semibold transition-colors duration-base lg:border-b-0 lg:border-l-2',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        ativo
                          ? 'border-brand-secondary bg-surface-2 text-text'
                          : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text',
                      )}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      ) : (
        <main className="flex-1">{children}</main>
      )}
      <Toaster />
    </div>
  );
}
