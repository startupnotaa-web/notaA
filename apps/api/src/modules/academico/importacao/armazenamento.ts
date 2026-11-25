import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_IMPORTACOES, LIMITE_IMPORTACAO_BYTES } from '@notaa/contracts';

export const ARMAZENAMENTO_PLANILHAS = Symbol('ARMAZENAMENTO_PLANILHAS');

/** Onde ficam as planilhas enviadas. Porta para os testes trocarem por memória. */
export interface ArmazenamentoPlanilhas {
  /** Token de upload de uso único para exatamente este caminho. */
  urlDeUpload(path: string): Promise<{ path: string; token: string }>;
  /** Tamanho REAL do objeto no Storage, em bytes; `null` se ainda não foi enviado. */
  tamanho(path: string): Promise<number | null>;
  /**
   * Baixa o arquivo; `null` se ainda não foi enviado. Consulta o tamanho antes e
   * recusa acima do limite SEM baixar (`ArquivoGrandeDemaisError`).
   */
  baixar(path: string): Promise<Uint8Array | null>;
}

export class ArquivoGrandeDemaisError extends Error {}

/**
 * Supabase Storage com a service role. O bucket `importacoes` é privado e sem
 * política para anon/authenticated (migração 0015): o navegador só consegue
 * enviar pelo token assinado que a API emite, e nunca consegue ler.
 *
 * O cliente é criado no primeiro uso, não no boot: a API sobe (e os testes
 * rodam) sem credencial de Storage, e só a rota de importação exige.
 */
export class ArmazenamentoSupabase implements ArmazenamentoPlanilhas {
  /** `cliente` só é injetado nos testes; em produção nasce no primeiro uso. */
  constructor(private cliente: SupabaseClient | null = null) {}

  private storage() {
    if (!this.cliente) {
      const url = process.env.SUPABASE_URL;
      const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !chave) {
        throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente da API.');
      }
      this.cliente = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
    }
    return this.cliente.storage.from(BUCKET_IMPORTACOES);
  }

  async urlDeUpload(path: string): Promise<{ path: string; token: string }> {
    const { data, error } = await this.storage().createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Falha ao gerar URL de upload: ${error?.message}`);
    return { path: data.path, token: data.token };
  }

  async tamanho(path: string): Promise<number | null> {
    const { data, error } = await this.storage().info(path);
    if (error || !data) return null;
    // Sem o tamanho não há como conferir o limite antes de baixar: não adivinha.
    if (typeof data.size !== 'number') throw new Error('O Storage não informou o tamanho do objeto.');
    return data.size;
  }

  async baixar(path: string): Promise<Uint8Array | null> {
    const tamanho = await this.tamanho(path);
    if (tamanho === null) return null;
    if (tamanho > LIMITE_IMPORTACAO_BYTES) throw new ArquivoGrandeDemaisError();
    const { data, error } = await this.storage().download(path);
    if (error || !data) return null;
    // O objeto pode ter sido trocado entre a consulta e o download.
    if (data.size > LIMITE_IMPORTACAO_BYTES) throw new ArquivoGrandeDemaisError();
    return new Uint8Array(await data.arrayBuffer());
  }
}
