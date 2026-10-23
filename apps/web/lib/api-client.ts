import { CABECALHO_CONTEXTO, serializarContexto } from '@notaa/contracts';
import { contextoAtivo, EVENTO_ACESSO_RECUSADO } from './contexto-de-acesso';
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

/**
 * Detecta se um erro é de rede/conexão (e não da nossa API). Inclui erros
 * injetados por extensões do navegador (password managers, ad blockers) que
 * tentam interceptar o fetch.
 */
function isNetworkOrExtensionError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // "Failed to fetch", "NetworkError", etc.
  if (error instanceof DOMException) return true; // "AbortError", etc.
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('could not establish connection') ||
      msg.includes('receiving end does not exist') ||
      msg.includes('load failed') ||
      msg.includes('aborted')
    );
  }
  return false;
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

  const contexto = contextoAtivo();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Só quando a conta tem mais de um acesso. O servidor confere o vínculo a cada requisição.
    ...(contexto ? { [CABECALHO_CONTEXTO]: serializarContexto(contexto) } : {}),
    ...(process.env.NODE_ENV === 'development' ? { 'x-development-mode': 'true' } : {}),
  };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (init.headers) {
    Object.assign(headers, init.headers);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(API_URL, path), {
      ...init,
      headers,
    });
  } catch (error) {
    // Erros de rede (DNS, conexão recusada, offline) ou de extensões do navegador.
    if (isNetworkOrExtensionError(error)) {
      console.warn(
        `[apiFetch] Erro de rede ao chamar ${path}:`,
        error instanceof Error ? error.message : error,
      );
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      );
    }
    throw error; // Erro inesperado — propaga como está.
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const error = body?.error;
    // Conta suspensa ou contexto que deixou de existir: quem reage é o ContextoDeAcessoProvider
    // (sai da sessão ou volta ao acesso padrão). O 401 apenas propaga a exceção: deixamos a camada
    // do Supabase Auth cuidar da sessão, evitando conflitos e loops de redirecionamento.
    if ((error?.code === 'CONTA_INATIVA' || error?.code === 'CONTEXTO_INVALIDO') && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTO_ACESSO_RECUSADO, { detail: error.code }));
    }
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN_ERROR', error?.message ?? 'Erro inesperado.');
  }

  return body as T;
}


/**
 * Baixa um arquivo da API (CSV de modelo ou de exportação) com o JWT da sessão
 * e entrega ao navegador como download. `apiFetch` não serve aqui porque lê a
 * resposta como JSON.
 */
export async function apiDownload(path: string, nomeArquivo: string): Promise<void> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(buildUrl(API_URL, path), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(process.env.NODE_ENV === 'development' ? { 'x-development-mode': 'true' } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN_ERROR', body?.error?.message ?? 'Erro inesperado.');
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Envia a planilha direto ao Storage pelo token assinado que a API emitiu. O
 * arquivo não passa pela API (limite de corpo da função serverless), e o bucket
 * é privado: este token só grava neste caminho, uma vez.
 */
export async function enviarPlanilha(
  upload: { bucket: string; path: string; token: string },
  arquivo: File,
): Promise<void> {
  const { error } = await supabaseBrowser.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, arquivo, { contentType: arquivo.type || undefined });
  if (error) throw new ApiError(0, 'UPLOAD_FALHOU', 'Não foi possível enviar o arquivo. Tente de novo.');
}
