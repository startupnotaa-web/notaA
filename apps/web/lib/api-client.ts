import { supabaseBrowser } from './supabase-browser';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Junta a base com o path deixando EXATAMENTE uma barra entre eles. Sem isto,
 * uma `NEXT_PUBLIC_API_URL` com `/` no fim + path começando com `/` gera `//`
 * (ex.: `…vercel.app//me/dashboard`), o que dispara um redirect 308 na Vercel e
 * quebra o preflight de CORS ("Redirect is not allowed for a preflight request").
 */
function buildUrl(base: string | undefined, path: string): string {
  const cleanBase = (base ?? '').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Único ponto que o Apresentação usa para falar com a Orquestração (doc 03
 * §1: "a Apresentação só conhece a Orquestração"). Anexa o JWT da sessão
 * Supabase atual — nunca chama a API sem token (exceto rotas @Public(), que
 * tratam ausência de header por conta própria).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(process.env.NODE_ENV === 'development' ? { 'x-development-mode': 'true' } : {}),
  };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (init.headers) {
    Object.assign(headers, init.headers);
  }

  const res = await fetch(buildUrl(API_URL, path), {
    ...init,
    headers,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const error = body?.error;
    // O erro 401 agora apenas propaga a exceção. 
    // Deixamos a camada do Supabase Auth e o onAuthStateChange cuidarem da sessão,
    // evitando conflitos e loops de redirecionamento.
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN_ERROR', error?.message ?? 'Erro inesperado.');
  }

  return body as T;
}
