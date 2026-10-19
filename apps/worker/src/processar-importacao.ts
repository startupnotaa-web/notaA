import { MapeamentoColunasSchema, type LinhaPrevia, type RelatorioImportacao } from '@notaa/contracts';
import {
  ImportacaoRepositoryDb,
  and,
  asc,
  eq,
  importacao,
  lt,
  registrarAuditoria,
  sql,
  type Database,
  type ResultadoAplicacao,
} from '@notaa/db';
import {
  ArquivoInvalidoError,
  detectarFormato,
  lerPlanilha,
  validarMapeamento,
} from '@notaa/importacao';

/** O que o worker precisa do Storage. */
export interface ArquivosDoWorker {
  baixar(path: string): Promise<Uint8Array | null>;
  /** Apaga a planilha depois de gravada: o dado já está no banco (minimização, LGPD). */
  remover(path: string): Promise<void>;
}

export interface DependenciasWorker {
  db: Database;
  arquivos: ArquivosDoWorker;
  log?: (mensagem: string, extra?: Record<string, unknown>) => void;
}

/** Itens do plano por transação. Cada lote grava e atualiza o progresso. */
export const TAMANHO_DO_LOTE = 500;
/** Processando há mais que isso = worker morreu no meio. */
export const PRAZO_TRAVADA_MS = 15 * 60 * 1000;
export const MAXIMO_DE_TENTATIVAS = 3;

/**
 * Pega a próxima importação confirmada. `FOR UPDATE SKIP LOCKED` deixa vários
 * workers rodarem juntos sem pegar a mesma linha, e sem fila externa.
 */
export async function pegarProxima(db: Database): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [proxima] = await tx
      .select({ id: importacao.id })
      .from(importacao)
      .where(eq(importacao.status, 'pendente'))
      .orderBy(asc(importacao.confirmadoEm))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!proxima) return null;
    await tx
      .update(importacao)
      .set({
        status: 'processando',
        iniciadoEm: new Date(),
        tentativas: sql`${importacao.tentativas} + 1`,
        atualizadoEm: new Date(),
      })
      .where(eq(importacao.id, proxima.id));
    return proxima.id;
  });
}

/**
 * Importação presa em 'processando' (o worker caiu) volta para a fila, até o
 * limite de tentativas. Voltar é seguro porque gravar é idempotente: o plano é
 * refeito contra o banco, e o que já entrou vira "sem alteração".
 */
export async function recuperarTravadas(db: Database, agora = new Date()): Promise<void> {
  const limite = new Date(agora.getTime() - PRAZO_TRAVADA_MS);
  const travadas = and(eq(importacao.status, 'processando'), lt(importacao.iniciadoEm, limite));
  await db
    .update(importacao)
    .set({
      status: sql`case when ${importacao.tentativas} >= ${MAXIMO_DE_TENTATIVAS} then 'falhou'::importacao_status else 'pendente'::importacao_status end`,
      erro: sql`case when ${importacao.tentativas} >= ${MAXIMO_DE_TENTATIVAS} then 'O processamento falhou repetidas vezes. Tente importar de novo.' else ${importacao.erro} end`,
      atualizadoEm: agora,
    })
    .where(travadas);
}

/** Processa uma importação que `pegarProxima` já marcou como 'processando'. */
export async function processarImportacao(deps: DependenciasWorker, id: string): Promise<void> {
  const { db, arquivos } = deps;
  const log = deps.log ?? (() => {});
  const [linha] = await db.select().from(importacao).where(eq(importacao.id, id)).limit(1);
  if (!linha || linha.status !== 'processando') return;

  const repo = new ImportacaoRepositoryDb(db);
  const autor = {
    instituicaoId: linha.instituicaoId,
    atorId: linha.criadoPor,
    papel: 'admin_instituicao',
    importacaoId: linha.id,
  };

  try {
    const bytes = await arquivos.baixar(linha.arquivoPath);
    if (!bytes) throw new ArquivoInvalidoError('A planilha não está mais disponível. Envie de novo.');
    const formato = detectarFormato(bytes, linha.nomeArquivo);
    const planilha = await lerPlanilha(bytes, formato);
    const mapeamento = MapeamentoColunasSchema.parse(linha.mapeamento ?? {});
    const erros = validarMapeamento(linha.tipo, mapeamento, planilha.cabecalhos.length);
    if (erros.length) throw new ArquivoInvalidoError(erros.join(' '));

    // Plano refeito AGORA, contra o banco atual, e não reaproveitado da prévia.
    const { tipo, plano } = await repo.planejar(linha.instituicaoId, linha.tipo, planilha, mapeamento);

    const total: ResultadoAplicacao = { criados: 0, atualizados: 0, responsaveisVinculados: 0 };
    for (let i = 0; i < plano.itens.length; i += TAMANHO_DO_LOTE) {
      const r =
        tipo === 'alunos'
          ? await repo.aplicarAlunos(plano.itens.slice(i, i + TAMANHO_DO_LOTE), autor)
          : await repo.aplicarDisciplinas(plano.itens.slice(i, i + TAMANHO_DO_LOTE), autor);
      total.criados += r.criados;
      total.atualizados += r.atualizados;
      total.responsaveisVinculados += r.responsaveisVinculados;
      await db
        .update(importacao)
        .set({ linhasProcessadas: Math.min(i + TAMANHO_DO_LOTE, plano.itens.length), atualizadoEm: new Date() })
        .where(eq(importacao.id, id));
    }

    const recusas: LinhaPrevia[] = plano.itens.map((it) => it.previa).filter((p) => p.acao === 'recusar');
    const relatorio: RelatorioImportacao = {
      criados: total.criados,
      atualizados: total.atualizados,
      // Linha planejada para criar que outra gravação criou antes conta aqui.
      semAlteracao: plano.itens.length - recusas.length - total.criados - total.atualizados,
      recusados: recusas.length,
      responsaveisVinculados: total.responsaveisVinculados,
      recusas,
    };
    await db.transaction(async (tx) => {
      await tx
        .update(importacao)
        .set({
          status: 'concluida',
          relatorio,
          linhasProcessadas: plano.itens.length,
          erro: null,
          concluidoEm: new Date(),
          atualizadoEm: new Date(),
        })
        .where(eq(importacao.id, id));
      await registrarAuditoria(tx, {
        instituicaoId: linha.instituicaoId,
        atorId: linha.criadoPor,
        papel: autor.papel,
        acao: 'importacao.concluida',
        entidade: 'importacao',
        entidadeId: id,
        dados: { tipo: linha.tipo, ...relatorio, recusas: undefined },
      });
    });
    await arquivos.remover(linha.arquivoPath).catch((e: unknown) =>
      log('Não foi possível apagar a planilha do Storage.', { id, erro: String(e) }),
    );
    log('Importação concluída.', { id, criados: relatorio.criados, atualizados: relatorio.atualizados });
  } catch (e) {
    // Mensagem de arquivo vai para a tela; erro inesperado não vaza detalhe interno.
    const motivo =
      e instanceof ArquivoInvalidoError ? e.message : 'Falha inesperada ao gravar. Tente importar de novo.';
    log('Importação falhou.', { id, erro: e instanceof Error ? e.message : String(e) });
    await db
      .update(importacao)
      .set({ status: 'falhou', erro: motivo, atualizadoEm: new Date() })
      .where(eq(importacao.id, id));
  }
}
