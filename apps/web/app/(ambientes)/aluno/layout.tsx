import { Sora } from 'next/font/google';
import type { ReactNode } from 'react';

// Sora 700 e 800 só para o aluno (títulos e botões de peso alto). Instância própria: as outras rotas não pagam por ela.
const soraPesada = Sora({ subsets: ['latin'], weight: ['700', '800'], display: 'swap', variable: '--nf-sora-pesada' });

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

export default function LayoutDoAluno({ children }: { children: ReactNode }) {
  return (
    <div
      data-ambiente="aluno"
      data-theme="light"
      className={`${soraPesada.variable} min-h-screen overflow-x-clip bg-amb-bg font-text text-amb-ink`}
    >
      {children}
    </div>
  );
}
