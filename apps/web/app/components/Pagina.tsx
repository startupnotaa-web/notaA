import type { ReactNode } from 'react';

const LARGURAS = {
  /** Leitura e formulários: telas do aluno em uma coluna. */
  estreita: 'max-w-2xl',
  /** Aluno em telas com mais conteúdo (estudo, perfil, relatório). */
  media: 'max-w-3xl',
  /** Painéis de instituição e professor: o PainelShell já limita a 1.280px. */
  larga: 'max-w-none',
} as const;

/**
 * Coluna de conteúdo de uma tela: margem de 16px no celular, respiro de `space-6` a `space-7` entre
 * os blocos e largura de leitura confortável. Conteúdo alinhado à esquerda; só a landing centraliza.
 */
export function Pagina({
  largura = 'media',
  children,
}: {
  largura?: keyof typeof LARGURAS;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto flex w-full flex-col gap-space-6 px-4 py-space-6 md:gap-space-7 md:py-space-7 ${LARGURAS[largura]}`}>
      {children}
    </div>
  );
}
