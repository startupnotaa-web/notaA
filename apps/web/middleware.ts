import { NextResponse, type NextRequest } from 'next/server';
import { FEATURES } from './lib/feature-flags';

/**
 * Porta de entrada das rotas ocultas (lib/feature-flags.ts).
 *
 * Fica no middleware, e não num layout com `notFound()`, porque um
 * `notFound()` disparado em layout devolve o HTML do 404 com status HTTP 200 —
 * a tela some, mas crawlers, monitores e testes continuam vendo a rota como
 * existente. Aqui a requisição é reescrita para um caminho que não existe, e
 * quem responde é o roteador do próprio Next: 404 de verdade, com a página de
 * 404 padrão.
 *
 * Nenhum arquivo de página é removido: ligar NEXT_PUBLIC_FEATURE_ARENA devolve
 * todas estas rotas ao ar.
 */
const ROTAS_DA_ARENA = ['/arena', '/batalha-coletiva', '/comunidade'];

/** Caminho sem página correspondente — existe só para o Next devolver o 404 dele. */
const CAMINHO_INEXISTENTE = '/_funcionalidade-oculta';

function estaEm(pathname: string, rotas: string[]): boolean {
  return rotas.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!FEATURES.arena && estaEm(pathname, ROTAS_DA_ARENA)) {
    return NextResponse.rewrite(new URL(CAMINHO_INEXISTENTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Só as rotas que podem estar ocultas passam por aqui — o resto do app não
  // paga o custo do middleware.
  matcher: ['/arena/:path*', '/batalha-coletiva/:path*', '/comunidade/:path*'],
};
