import { Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

// Newsreader só aqui: a faculdade é o único ambiente com serifa. Instância própria, para as outras rotas não a carregarem.
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--nf-newsreader' });

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

export default function LayoutDaFaculdade({ children }: { children: ReactNode }) {
  return (
    <div
      data-ambiente="faculdade"
      data-theme="light"
      className={`${newsreader.variable} min-h-screen overflow-x-clip bg-amb-bg font-text text-amb-ink`}
    >
      {children}
    </div>
  );
}
