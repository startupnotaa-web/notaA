import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BUCKET_IMPORTACOES,
  MapeamentoColunasSchema,
  RelatorioImportacaoSchema,
  ResumoImportacaoSchema,
  type ArquivoRecebidoResponse,
  type CriarImportacaoRequest,
  type CriarImportacaoResponse,
  type FormatoPlanilha,
  type Importacao,
  type MapeamentoColunas,
  type PreviaQuery,
  type PreviaResponse,
  type TipoExportacao,
  type TipoImportacao,
} from '@notaa/contracts';
import {
  Database,
  ImportacaoRepositoryDb,
  and,
  desc,
  eq,
  importacao,
  inArray,
  isNotNull,
  registrarAuditoria,
  type PlanoPorTipo,
} from '@notaa/db';
import {
  ArquivoInvalidoError,
  cabecalhoDoModelo,
  camposDoTipo,
  detectarFormato,
  gerarCsv,
  lerPlanilha,
  sugerirMapeamento,
  validarMapeamento,
  type Planilha,
} from '@notaa/importacao';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService } from '../escopo/escopo.service';
import {
  ARMAZENAMENTO_PLANILHAS,
  ArquivoGrandeDemaisError,
  type ArmazenamentoPlanilhas,
} from './armazenamento';

type LinhaImportacao = typeof importacao.$inferSelect;

function naoEncontrada(): never {
  throw new NotFoundException({ error: { code: 'NAO_ENCONTRADO', message: 'Importação não encontrada.' } });
}

function estadoInvalido(message: string): never {
  throw new ConflictException({ error: { code: 'ESTADO_INVALIDO', message } });
}

function arquivoInvalido(message: string): never {
  throw new UnprocessableEntityException({ error: { code: 'ARQUIVO_INVALIDO', message } });
}

function paraImportacao(i: LinhaImportacao): Importacao {
  return {
    id: i.id,
    tipo: i.tipo,
    status: i.status,
    nomeArquivo: i.nomeArquivo,
    formato: (i.formato as FormatoPlanilha | null) ?? null,
    totalLinhas: i.totalLinhas ?? null,
    linhasProcessadas: i.linhasProcessadas,
    cabecalhos: (i.cabecalhos as string[] | null) ?? null,
    mapeamento: (i.mapeamento as MapeamentoColunas | null) ?? null,
    resumoPrevia: i.resumoPrevia ? ResumoImportacaoSchema.parse(i.resumoPrevia) : null,
    relatorio: i.relatorio ? RelatorioImportacaoSchema.parse(i.relatorio) : null,
    erro: i.erro ?? null,
    criadoEm: i.criadoEm.toISOString(),
    concluidoEm: i.concluidoEm?.toISOString() ?? null,
  };
}

/** Linha de exemplo do modelo para download, para mostrar o formato esperado. */
const EXEMPLO_MODELO: Record<TipoImportacao, string[]> = {
  alunos: [
    '2026001', 'Ana Souza', '05/03/2010', '', '1º ano A',
    'Maria Souza', 'maria.souza@exemplo.com', '(11) 99999-0000', 'mãe',
    '', '', '', '',
  ],
  disciplinas: ['Matemática', 'MAT', 'Matemática'],
};

/**
 * Importação de planilha, do upload até a confirmação. Quem grava é o worker
 * (`apps/worker`); aqui fica o que é interativo: receber, conferir, mapear e
 * mostrar a prévia. A prévia e o worker usam o MESMO plano
 * (`ImportacaoRepositoryDb.planejar`), então o que a tela mostra é o que será feito.
 */
@Injectable()
export class ImportacaoService {
  private readonly repo: ImportacaoRepositoryDb;

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(ARMAZENAMENTO_PLANILHAS) private readonly armazenamento: ArmazenamentoPlanilhas,
    private readonly escopo: EscopoService,
  ) {
    this.repo = new ImportacaoRepositoryDb(db);
  }

  private async daInstituicao(usuarioId: string, id: string): Promise<{ linha: LinhaImportacao; instituicaoId: string }> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const [linha] = await this.db
      .select()
      .from(importacao)
      .where(and(eq(importacao.id, id), eq(importacao.instituicaoId, instituicaoId)))
      .limit(1);
    if (!linha) naoEncontrada();
    return { linha, instituicaoId };
  }

  private async lerArquivo(linha: LinhaImportacao): Promise<{ formato: FormatoPlanilha; planilha: Planilha }> {
    let bytes: Uint8Array | null;
    try {
      bytes = await this.armazenamento.baixar(linha.arquivoPath);
    } catch (e) {
      if (e instanceof ArquivoGrandeDemaisError) arquivoInvalido('O arquivo passa de 10 MB.');
      throw e;
    }
    if (!bytes) estadoInvalido('O arquivo ainda não chegou. Envie de novo.');
    try {
      const formato = detectarFormato(bytes, linha.nomeArquivo);
      return { formato, planilha: await lerPlanilha(bytes, formato) };
    } catch (e) {
      if (e instanceof ArquivoInvalidoError) arquivoInvalido(e.message);
      throw e;
    }
  }

  async listar(usuarioId: string): Promise<Importacao[]> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const linhas = await this.db
      .select()
      .from(importacao)
      .where(eq(importacao.instituicaoId, instituicaoId))
      .orderBy(desc(importacao.criadoEm))
      .limit(20);
    return linhas.map(paraImportacao);
  }

  async obter(usuarioId: string, id: string): Promise<Importacao> {
    return paraImportacao((await this.daInstituicao(usuarioId, id)).linha);
  }

  /**
   * Cria a importação e um token de upload para um caminho que a API escolhe
   * (`<instituição>/<importação>.<ext>`). O nome do arquivo do usuário nunca
   * entra no caminho.
   */
  async criar(usuarioId: string, body: CriarImportacaoRequest): Promise<CriarImportacaoResponse> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const id = randomUUID();
    const extensao = body.nomeArquivo.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';
    const path = `${instituicaoId}/${id}.${extensao}`;
    const upload = await this.armazenamento.urlDeUpload(path);
    await this.db.insert(importacao).values({
      id,
      instituicaoId,
      tipo: body.tipo,
      nomeArquivo: body.nomeArquivo,
      arquivoPath: path,
      tamanhoBytes: body.tamanhoBytes,
      criadoPor: usuarioId,
    });
    return { id, upload: { bucket: BUCKET_IMPORTACOES, path: upload.path, token: upload.token } };
  }

  /** Confere o arquivo enviado (tipo real, tamanho, linhas) e sugere o mapeamento. */
  async arquivoEnviado(usuarioId: string, id: string): Promise<ArquivoRecebidoResponse> {
    const { linha, instituicaoId } = await this.daInstituicao(usuarioId, id);
    if (linha.status !== 'aguardando_arquivo' && linha.status !== 'em_previa') {
      estadoInvalido('Esta importação já foi confirmada.');
    }

    let lido: Awaited<ReturnType<ImportacaoService['lerArquivo']>>;
    try {
      lido = await this.lerArquivo(linha);
    } catch (e) {
      if (e instanceof UnprocessableEntityException) {
        const motivo = (e.getResponse() as { error: { message: string } }).error.message;
        await this.db
          .update(importacao)
          .set({ status: 'falhou', erro: motivo, atualizadoEm: new Date() })
          .where(eq(importacao.id, id));
      }
      throw e;
    }

    const [anterior] = await this.db
      .select({ cabecalhos: importacao.cabecalhos, mapeamento: importacao.mapeamento })
      .from(importacao)
      .where(
        and(
          eq(importacao.instituicaoId, instituicaoId),
          eq(importacao.tipo, linha.tipo),
          inArray(importacao.status, ['pendente', 'processando', 'concluida']),
          isNotNull(importacao.mapeamento),
        ),
      )
      .orderBy(desc(importacao.confirmadoEm))
      .limit(1);
    const mapeamentoAnterior = anterior ? MapeamentoColunasSchema.safeParse(anterior.mapeamento) : null;
    const mapeamentoSugerido = sugerirMapeamento(
      linha.tipo,
      lido.planilha.cabecalhos,
      anterior && mapeamentoAnterior?.success
        ? { cabecalhos: (anterior.cabecalhos as string[]) ?? [], mapeamento: mapeamentoAnterior.data }
        : null,
    );

    await this.db
      .update(importacao)
      .set({
        status: 'em_previa',
        formato: lido.formato,
        totalLinhas: lido.planilha.linhas.length,
        cabecalhos: lido.planilha.cabecalhos,
        mapeamento: mapeamentoSugerido,
        resumoPrevia: null,
        erro: null,
        atualizadoEm: new Date(),
      })
      .where(eq(importacao.id, id));

    return {
      formato: lido.formato,
      totalLinhas: lido.planilha.linhas.length,
      cabecalhos: lido.planilha.cabecalhos,
      campos: camposDoTipo(linha.tipo),
      mapeamentoSugerido,
    };
  }

  async salvarMapeamento(usuarioId: string, id: string, mapeamento: MapeamentoColunas): Promise<Importacao> {
    const { linha } = await this.daInstituicao(usuarioId, id);
    if (linha.status !== 'em_previa') estadoInvalido('O mapeamento só muda antes da confirmação.');
    const erros = validarMapeamento(linha.tipo, mapeamento, ((linha.cabecalhos as string[]) ?? []).length);
    if (erros.length) {
      throw new BadRequestException({ error: { code: 'MAPEAMENTO_INVALIDO', message: erros.join(' '), details: erros } });
    }
    const [atualizada] = await this.db
      .update(importacao)
      .set({ mapeamento, resumoPrevia: null, atualizadoEm: new Date() })
      .where(eq(importacao.id, id))
      .returning();
    return paraImportacao(atualizada!);
  }

  async previa(usuarioId: string, id: string, query: PreviaQuery): Promise<PreviaResponse> {
    const { linha, instituicaoId } = await this.daInstituicao(usuarioId, id);
    if (linha.status !== 'em_previa') estadoInvalido('A prévia só existe antes da confirmação.');
    const mapeamento = MapeamentoColunasSchema.parse(linha.mapeamento ?? {});
    const erros = validarMapeamento(linha.tipo, mapeamento, ((linha.cabecalhos as string[]) ?? []).length);
    if (erros.length) estadoInvalido(erros.join(' '));

    const { planilha } = await this.lerArquivo(linha);
    const { plano } = await this.repo.planejar(instituicaoId, linha.tipo, planilha, mapeamento);
    await this.db
      .update(importacao)
      .set({ resumoPrevia: plano.resumo, atualizadoEm: new Date() })
      .where(eq(importacao.id, id));

    const todas = (plano.itens as PlanoPorTipo['plano']['itens']).map((i) => i.previa);
    const filtradas = query.acao ? todas.filter((l) => l.acao === query.acao) : todas;
    const inicio = (query.pagina - 1) * query.porPagina;
    return {
      resumo: plano.resumo,
      linhas: filtradas.slice(inicio, inicio + query.porPagina),
      total: filtradas.length,
      pagina: query.pagina,
      porPagina: query.porPagina,
    };
  }

  /**
   * Põe na fila do worker. O UPDATE condicional ao status garante que dois
   * cliques não enfileiram duas vezes.
   */
  async confirmar(usuarioId: string, papel: string, id: string): Promise<Importacao> {
    const { linha, instituicaoId } = await this.daInstituicao(usuarioId, id);
    if (!linha.resumoPrevia) estadoInvalido('Veja a prévia antes de confirmar.');
    return this.db.transaction(async (tx) => {
      const [confirmada] = await tx
        .update(importacao)
        .set({ status: 'pendente', confirmadoEm: new Date(), atualizadoEm: new Date() })
        .where(and(eq(importacao.id, id), eq(importacao.status, 'em_previa')))
        .returning();
      if (!confirmada) estadoInvalido('Esta importação já foi confirmada.');
      await registrarAuditoria(tx, {
        instituicaoId,
        atorId: usuarioId,
        papel,
        acao: 'importacao.confirmada',
        entidade: 'importacao',
        entidadeId: id,
        dados: { tipo: linha.tipo, nomeArquivo: linha.nomeArquivo, previa: linha.resumoPrevia },
      });
      return paraImportacao(confirmada);
    });
  }

  modelo(tipo: TipoImportacao): string {
    return gerarCsv(cabecalhoDoModelo(tipo), [EXEMPLO_MODELO[tipo]]);
  }

  /** Exportação: só a gestão, e sempre auditada (é dado pessoal saindo da plataforma). */
  async exportar(usuarioId: string, papel: string, tipo: TipoExportacao): Promise<string> {
    const instituicaoId = await this.escopo.instituicaoDoGestor(usuarioId, 'exportar dados');
    const linhas =
      tipo === 'alunos'
        ? await this.repo.exportarAlunos(instituicaoId)
        : await this.repo.exportarDisciplinas(instituicaoId);
    await registrarAuditoria(this.db, {
      instituicaoId,
      atorId: usuarioId,
      papel,
      acao: 'exportacao.realizada',
      entidade: tipo === 'alunos' ? 'aluno_instituicao' : 'disciplina',
      dados: { tipo, linhas: linhas.length },
    });
    return gerarCsv(cabecalhoDoModelo(tipo), linhas);
  }
}
