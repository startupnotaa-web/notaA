import { NextResponse, type NextRequest } from 'next/server';
import { CABECALHOS_DE_SEGURANCA, montarCsp } from './lib/csp';
import { FEATURES } from './lib/feature-flags';

/**
 * Porta de entrada das rotas ocultas (lib/feature-flags.ts) e CSP das páginas públicas (lib/csp.ts).
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

/**
 * Páginas públicas que recebem CSP com nonce (lib/csp.ts). Caminhos exatos, não prefixos: "/" casaria o app todo.
 * "/professores" é a landing; "/professor" (sem "es") é o painel autenticado e fica de fora.
 */
const ROTAS_PUBLICAS_COM_CSP = ['/', '/aluno', '/professores', '/escola', '/faculdade', '/privacidade', '/termos'];

function estaEm(pathname: string, rotas: string[]): boolean {
  return rotas.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!FEATURES.arena && estaEm(pathname, ROTAS_DA_ARENA)) {
    return NextResponse.rewrite(new URL(CAMINHO_INEXISTENTE, request.url));
  }

  if (ROTAS_PUBLICAS_COM_CSP.includes(pathname)) {
    const nonce = btoa(crypto.randomUUID());
    const csp = montarCsp(nonce);
    // O Next lê o nonce do cabeçalho da REQUISIÇÃO e o aplica aos scripts dele; a resposta leva a mesma política.
    const cabecalhos = new Headers(request.headers);
    cabecalhos.set('x-nonce', nonce);
    cabecalhos.set('Content-Security-Policy', csp);
    const resposta = NextResponse.next({ request: { headers: cabecalhos } });
    resposta.headers.set('Content-Security-Policy', csp);
    for (const [nome, valor] of Object.entries(CABECALHOS_DE_SEGURANCA)) resposta.headers.set(nome, valor);
    return resposta;
  }

  return NextResponse.next();
}

export const config = {
  // Só as rotas que podem estar ocultas e as páginas públicas com CSP passam por aqui — o resto do
  // app não paga o custo do middleware.
  matcher: [
    '/arena/:path*',
    '/batalha-coletiva/:path*',
    '/comunidade/:path*',
    '/',
    '/aluno',
    '/professores',
    '/escola',
    '/faculdade',
    '/privacidade',
    '/termos',
  ],
};
