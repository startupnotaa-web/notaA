'use client';

import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@notaa/ui';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';

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
 */
export function PainelShell({
  titulo,
  papeisPermitidos,
  children,
}: {
  titulo: string;
  papeisPermitidos: readonly string[];
  children: ReactNode;
}) {
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
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
