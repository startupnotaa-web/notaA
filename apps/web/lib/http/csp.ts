/**
 * Content-Security-Policy das páginas públicas (landing, privacidade e termos).
 *
 * Sem script inline: o que roda é arquivo do próprio site ou carrega com o `nonce` desta requisição
 * (o Next aplica o nonce aos scripts dele quando o cabeçalho chega no request). Por isso essas páginas
 * renderizam por requisição (`dynamic = 'force-dynamic'` no layout de cada rota): um HTML gerado no build
 * não tem nonce.
 *
 * Estilo só de arquivo (`style-src 'self'`): o HTML da landing não leva `style="…"`, e o React aplica
 * estilo dinâmico pela API do DOM, que a CSP não bloqueia.
 *
 * O resto do app (telas autenticadas) fica fora deste escopo.
 */

function origemDe(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function montarCsp(nonce: string, dev = process.env.NODE_ENV !== 'production'): string {
  // O formulário fala com a API; o AuthProvider do layout raiz fala com o Supabase.
  const conexoes = [
    "'self'",
    origemDe(process.env.NEXT_PUBLIC_API_URL),
    origemDe(process.env.NEXT_PUBLIC_SUPABASE_URL),
    dev ? 'ws:' : null,
  ].filter(Boolean);

  const diretivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Sem 'strict-dynamic': com ele o navegador ignora 'self', e o /theme-init.js (do layout raiz, sem nonce) e os
    // chunks carregados sob demanda, como o do three, teriam de levar nonce. 'self' + nonce cobre os dois.
    'script-src': ["'self'", `'nonce-${nonce}'`, ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", ...(dev ? ["'unsafe-inline'"] : [])],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': conexoes as string[],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const texto = Object.entries(diretivas)
    .map(([nome, valores]) => `${nome} ${valores.join(' ')}`)
    .join('; ');
  return dev ? texto : `${texto}; upgrade-insecure-requests`;
}

/** Cabeçalhos de segurança que acompanham a CSP nas páginas públicas. */
export const CABECALHOS_DE_SEGURANCA: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
