import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { BUCKET_IMPORTACOES, LIMITE_IMPORTACAO_BYTES } from '@notaa/contracts';
import { createDbClient } from '@notaa/db';
import {
  pegarProxima,
  processarImportacao,
  recuperarTravadas,
  type ArquivosDoWorker,
} from './processar-importacao';

// Worker de longa duração (docs/03 §3.3): consome a fila que é a própria
// tabela `importacao`. Roda fora da Vercel, porque a API é serverless e não
// tem processo vivo entre requisições. Onde hospedar está em aberto.
//
//   DATABASE_URL, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
//   pnpm --filter @notaa/worker dev

const ESPERA_SEM_TRABALHO_MS = 5_000;
const RECUPERAR_TRAVADAS_A_CADA_MS = 60_000;

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} não configurado no ambiente do worker.`);
  return valor;
}

function log(mensagem: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ quando: new Date().toISOString(), mensagem, ...extra }));
}

async function main(): Promise<void> {
  const db = createDbClient(exigir('DATABASE_URL'));
  const storage = createClient(exigir('SUPABASE_URL'), exigir('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from(BUCKET_IMPORTACOES);

  const arquivos: ArquivosDoWorker = {
    async baixar(path) {
      const { data, error } = await storage.download(path);
      if (error || !data) return null;
      if (data.size > LIMITE_IMPORTACAO_BYTES) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    async remover(path) {
      const { error } = await storage.remove([path]);
      if (error) throw new Error(error.message);
    },
  };

  let parar = false;
  for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sinal, () => {
      log(`Recebido ${sinal}: termina a importação atual e sai.`);
      parar = true;
    });
  }

  let ultimaRecuperacao = 0;
  log('Worker de importação no ar.');
  while (!parar) {
    try {
      if (Date.now() - ultimaRecuperacao > RECUPERAR_TRAVADAS_A_CADA_MS) {
        await recuperarTravadas(db);
        ultimaRecuperacao = Date.now();
      }
      const id = await pegarProxima(db);
      if (id) {
        log('Processando importação.', { id });
        await processarImportacao({ db, arquivos, log }, id);
        continue;
      }
    } catch (e) {
      log('Erro no laço do worker.', { erro: e instanceof Error ? e.message : String(e) });
    }
    await new Promise((r) => setTimeout(r, ESPERA_SEM_TRABALHO_MS));
  }
  process.exit(0);
}

void main();
