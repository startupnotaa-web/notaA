import type { Papel } from '@notaa/contracts';

/**
 * Para onde cada papel vai, e o que cada papel pode abrir. Funções puras, sem rede nem React: o
 * destino pós-login era decidido em três lugares diferentes e, em todos, o que não casava caía no
 * hub do aluno. Aqui o que não casa cai na home DO PRÓPRIO papel.
 *
 * Isto é experiência, não autorização: o servidor recusa por conta própria (RolesGuard + RBAC +
 * RLS). O papel que entra aqui vem do token (`app_metadata`, escrito só pela service role) ou de
 * `GET /me`, nunca de `user_metadata`, que o usuário edita.
 */

const PROFESSORES = ['professor_institucional', 'professor_independente'] as const satisfies readonly Papel[];

export const HOME_POR_PAPEL: Readonly<Record<Papel, string>> = {
  estudante: '/dashboard',
  professor_institucional: '/professor',
  professor_independente: '/professor',
  admin_instituicao: '/instituicao',
  responsavel: '/responsavel',
  admin: '/admin',
};

/** Papéis que o app conhece. Qualquer outro valor vindo de fora é tratado como "sem papel". */
export function papelConhecido(valor: unknown): Papel | null {
  return typeof valor === 'string' && Object.hasOwn(HOME_POR_PAPEL, valor) ? (valor as Papel) : null;
}

interface RegraDeRota {
  prefixo: string;
  papeis: readonly Papel[];
}

/**
 * Prefixo → papéis. Rota que não está aqui NÃO é aceita como `next`: a lista é de permissão, não de
 * bloqueio, para que uma rota nova nasça fechada. `/professor` e `/instituicao` seguem o ROUTE_ROLES
 * da API; `/perfil` é de todos porque é a única tela de perfil de professor e instituição.
 */
const REGRAS_DE_ROTA: readonly RegraDeRota[] = [
  { prefixo: '/perfil', papeis: ['estudante', 'professor_institucional', 'professor_independente', 'admin_instituicao'] },
  { prefixo: '/professor', papeis: [...PROFESSORES, 'admin'] },
  { prefixo: '/instituicao', papeis: ['admin_instituicao'] },
  { prefixo: '/responsavel', papeis: ['responsavel'] },
  { prefixo: '/admin', papeis: ['admin'] },
  ...[
    '/dashboard',
    '/trilhas',
    '/estudo',
    '/quiz',
    '/simulado',
    '/redacao',
    '/tutor',
    '/minha-narrativa',
    '/mapa-conhecimento',
    '/previsao-nota',
    '/certificados',
    '/relatorio-familiar',
    '/onboarding',
    // Arena, batalha e comunidade ficam ocultas por feature flag (middleware), mas a regra já existe.
    '/arena',
    '/batalha-coletiva',
    '/comunidade',
  ].map((prefixo): RegraDeRota => ({ prefixo, papeis: ['estudante'] })),
];

function casaComPrefixo(pathname: string, prefixo: string): boolean {
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`);
}

/** O papel pode abrir esta rota? Rota desconhecida: não. `pathname` sem query nem hash. */
export function papelPodeAbrir(papel: Papel, pathname: string): boolean {
  const regra = REGRAS_DE_ROTA.find((r) => casaComPrefixo(pathname, r.prefixo));
  return regra ? regra.papeis.includes(papel) : false;
}

/** Papéis que podem abrir esta rota (para os guardas dos painéis). Vazio se a rota não é conhecida. */
export function papeisDaRota(pathname: string): readonly Papel[] {
  return REGRAS_DE_ROTA.find((r) => casaComPrefixo(pathname, r.prefixo))?.papeis ?? [];
}

/** Caractere de controle (inclui CR e LF), DEL ou barra invertida: o navegador trataria `\\` como `/`. */
function temControleOuBarraInvertida(texto: string): boolean {
  for (const c of texto) {
    const codigo = c.charCodeAt(0);
    if (codigo <= 0x1f || codigo === 0x7f || c === '\\') return true;
  }
  return false;
}
const ORIGEM_FALSA = 'http://interno.invalid';

/**
 * Aceita só caminho relativo interno. Devolve o caminho normalizado (com query e hash) ou null.
 *
 * Recusa: vazio, esquema (`https:`, `javascript:`), `//` (URL sem esquema), barra invertida (o
 * navegador a trata como `/`), caracteres de controle (CR/LF) e a versão com `%` decodificado de
 * tudo isso. A checagem final resolve o caminho como o navegador resolveria e exige que a origem
 * continue sendo a nossa, o que pega o que as regras acima deixarem passar.
 */
export function caminhoInternoSeguro(next: string | null | undefined): string | null {
  if (typeof next !== 'string' || next === '' || next.length > 512) return null;
  if (temControleOuBarraInvertida(next)) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;

  let decodificado: string;
  try {
    decodificado = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (temControleOuBarraInvertida(decodificado) || decodificado.startsWith('//')) return null;

  let url: URL;
  try {
    url = new URL(next, ORIGEM_FALSA);
  } catch {
    return null;
  }
  if (url.origin !== ORIGEM_FALSA) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Destino depois do login. `next` só vale se for interno e se o papel tem permissão naquela rota;
 * qualquer outra coisa vai para a home do papel. Sem papel conhecido, volta ao login (nunca ao hub
 * do aluno).
 */
export function resolverDestino(contexto: { papel: Papel | null }, next?: string | null): string {
  if (!contexto.papel) return '/login';
  const seguro = caminhoInternoSeguro(next);
  if (seguro) {
    const pathname = seguro.split(/[?#]/, 1)[0] ?? '/';
    if (papelPodeAbrir(contexto.papel, pathname)) return seguro;
  }
  return HOME_POR_PAPEL[contexto.papel];
}

/** Home do papel, para o botão do 403. Sem papel, a tela de login. */
export function homeDoPapel(papel: Papel | null): string {
  return papel ? HOME_POR_PAPEL[papel] : '/login';
}

export type Acesso =
  | { estado: 'carregando' }
  | { estado: 'sem-sessao' }
  /** Há sessão, mas o token não traz um papel que o app conheça (cadastro que não terminou). */
  | { estado: 'sem-papel' }
  | { estado: 'negado'; papel: Papel }
  | { estado: 'ok'; papel: Papel };

/**
 * Decisão dos guardas de tela. O papel vem do TOKEN (`app_metadata`), não de `GET /me`: uma falha de
 * `/me` não pode transformar professor em "papel errado". Rota sem nenhum papel permitido nega a
 * todos (a lista é de permissão).
 */
export function decidirAcesso(
  entrada: { carregando: boolean; temSessao: boolean; papelNoToken: unknown },
  permitidos: readonly Papel[],
): Acesso {
  if (entrada.carregando) return { estado: 'carregando' };
  if (!entrada.temSessao) return { estado: 'sem-sessao' };
  const papel = papelConhecido(entrada.papelNoToken);
  if (!papel) return { estado: 'sem-papel' };
  return permitidos.includes(papel) ? { estado: 'ok', papel } : { estado: 'negado', papel };
}
