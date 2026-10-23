import type { Metadata } from 'next';

/** Endereço público do site. Em preview da Vercel não é o canônico, por isso a variável. */
export const URL_DO_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notaa.com.br';

interface DadosDaPagina {
  titulo: string;
  descricao: string;
  /** Caminho da página, com a barra inicial ("/aluno"). A home é "/". */
  caminho: string;
  /** Nome do arquivo em public/og, sem extensão. */
  imagem: string;
  /** Página que não deve aparecer nos buscadores (ex.: texto legal ainda sem dados da empresa). */
  semIndexacao?: boolean;
}

/**
 * Metadados das páginas públicas: título, descrição, canonical, Open Graph e Twitter. Fora de produção a página
 * sai com noindex, para preview e branch não competirem com o site de verdade nos buscadores.
 */
export function metadadosDaPagina({ titulo, descricao, caminho, imagem, semIndexacao = false }: DadosDaPagina): Metadata {
  const emProducao = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    robots: emProducao && !semIndexacao ? undefined : { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Nota A',
      title: titulo,
      description: descricao,
      url: caminho,
      images: [{ url: `/og/${imagem}.png`, width: 1200, height: 630, alt: titulo }],
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descricao, images: [`/og/${imagem}.png`] },
  };
}
