'use client';
// Último recurso: o erro aconteceu no layout raiz, então esta tela substitui <html>. As fontes do
// next/font não existem aqui; vale a pilha de sistema dos tokens.
import { Button, Notice } from '@notaa/ui';
import './globals.css';

export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR" data-theme="light">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-space-5 px-4 py-space-7">
          <h1 className="m-0 font-display text-[28px] leading-9 tracking-[-0.02em] sm:text-heading-1">Algo deu errado</h1>
          <Notice tone="danger" title="O Nota A não conseguiu abrir">
            Tente de novo. Se continuar, feche e abra o aplicativo.
            {error.digest ? <span className="mt-2 block text-caption">Código do erro: {error.digest}</span> : null}
          </Notice>
          <div>
            <Button variant="primary" onClick={reset}>
              Tentar de novo
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
