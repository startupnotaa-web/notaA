import type { ReactNode } from 'react';

const LARGURAS = {
  /** Usa a largura toda, até `page-max` (1760px). O padrão no computador. */
  fluida: 'max-w-pagina',
  /** Só para texto corrido de leitura (um documento), nunca para telas de trabalho. */
  leitura: 'max-w-3xl',
  /** Nomes antigos, mantidos até todas as telas virarem grades. */
  estreita: 'max-w-2xl',
  media: 'max-w-3xl',
  larga: 'max-w-pagina',
} as const;

/**
 * Área de conteúdo de uma tela dentro do `AppFrame`: margem de 16px no celular, `space-5` a `space-6` nas
 * laterais no computador, e conteúdo fluido até `page-max` (centraliza só acima disso). Conteúdo alinhado
 * à esquerda. Componha o interior com `Grade` e `Col` em vez de uma coluna única.
 */
export function Pagina({
  largura = 'fluida',
  children,
}: {
  largura?: keyof typeof LARGURAS;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-space-6 px-4 py-space-5 md:px-space-5 md:py-space-6 lg:gap-space-6 lg:px-space-6 ${LARGURAS[largura]}`}
    >
      {children}
    </div>
  );
}
