import { NextResponse, type NextRequest } from 'next/server';
import { CABECALHOS_DE_SEGURANCA, montarCsp } from './lib/http/csp';

/**
 * Páginas públicas que recebem CSP com nonce (lib/http/csp.ts). Caminhos exatos, não prefixos: "/" casaria o app todo.
 * "/professores" é a landing; "/professor" (sem "es") é o painel autenticado e fica de fora.
 */
const ROTAS_PUBLICAS_COM_CSP = ['/', '/aluno', '/professores', '/escola', '/faculdade', '/privacidade', '/termos'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: [
    '/',
    '/aluno',
    '/professores',
    '/escola',
    '/faculdade',
    '/privacidade',
    '/termos',
  ],
};
