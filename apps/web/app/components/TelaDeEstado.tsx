import type { ReactNode } from 'react';
import { NotaASimbolo, PageHeader } from '@notaa/ui';

/**
 * Tela inteira para um estado do app (página não encontrada, erro, sem conexão): marca, um título, a
 * explicação e o próximo passo. Alinhada à esquerda, em coluna de leitura. Serve fora de qualquer shell.
 */
export function TelaDeEstado({
  titulo,
  children,
  acoes,
}: {
  titulo: string;
  children: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-space-6 px-4 py-space-7">
      <NotaASimbolo className="h-8 w-auto self-start" />
      <PageHeader title={titulo} description={children} />
      {acoes ? <div className="flex flex-wrap gap-space-3">{acoes}</div> : null}
    </main>
  );
}
