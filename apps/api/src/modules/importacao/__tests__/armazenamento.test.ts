import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITE_IMPORTACAO_BYTES } from '@notaa/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ArmazenamentoSupabase, ArquivoGrandeDemaisError } from '../armazenamento';

// O tamanho que vale é o do OBJETO no Storage, consultado antes de baixar: o
// `tamanhoBytes` que o navegador declara na criação não é prova de nada.

function clienteFalso(opcoes: { tamanho?: number | null; erroInfo?: boolean; conteudo?: Uint8Array }) {
  const info = vi.fn(async () =>
    opcoes.erroInfo || opcoes.tamanho === null
      ? { data: null, error: { message: 'Object not found' } }
      : { data: { size: opcoes.tamanho }, error: null },
  );
  const conteudo = opcoes.conteudo ?? new Uint8Array(3);
  const download = vi.fn(async () => ({ data: new Blob([conteudo]), error: null }));
  const cliente = { storage: { from: () => ({ info, download }) } } as unknown as SupabaseClient;
  return { armazenamento: new ArmazenamentoSupabase(cliente), info, download };
}

describe('ArmazenamentoSupabase.tamanho', () => {
  it('devolve o tamanho do objeto', async () => {
    const { armazenamento } = clienteFalso({ tamanho: 1024 });
    expect(await armazenamento.tamanho('a/b.csv')).toBe(1024);
  });

  it('devolve null quando o objeto ainda não foi enviado', async () => {
    const { armazenamento } = clienteFalso({ tamanho: null });
    expect(await armazenamento.tamanho('a/b.csv')).toBeNull();
  });

  it('não adivinha: se o Storage não informa o tamanho, falha', async () => {
    const { armazenamento } = clienteFalso({ tamanho: undefined });
    await expect(armazenamento.tamanho('a/b.csv')).rejects.toThrow(/tamanho/);
  });
});

describe('ArmazenamentoSupabase.baixar', () => {
  it('acima do limite recusa SEM baixar', async () => {
    const { armazenamento, download } = clienteFalso({ tamanho: LIMITE_IMPORTACAO_BYTES + 1 });
    await expect(armazenamento.baixar('a/b.csv')).rejects.toBeInstanceOf(ArquivoGrandeDemaisError);
    expect(download).not.toHaveBeenCalled();
  });

  it('no limite exato baixa', async () => {
    const { armazenamento, download } = clienteFalso({ tamanho: LIMITE_IMPORTACAO_BYTES, conteudo: new Uint8Array([1, 2, 3]) });
    expect(await armazenamento.baixar('a/b.csv')).toEqual(new Uint8Array([1, 2, 3]));
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('objeto ausente devolve null sem tentar baixar', async () => {
    const { armazenamento, download } = clienteFalso({ tamanho: null });
    expect(await armazenamento.baixar('a/b.csv')).toBeNull();
    expect(download).not.toHaveBeenCalled();
  });

  it('se o conteúdo baixado passar do limite mesmo assim, recusa', async () => {
    // O objeto foi trocado entre a consulta e o download.
    const { armazenamento } = clienteFalso({ tamanho: 10, conteudo: new Uint8Array(LIMITE_IMPORTACAO_BYTES + 1) });
    await expect(armazenamento.baixar('a/b.csv')).rejects.toBeInstanceOf(ArquivoGrandeDemaisError);
  });
});
