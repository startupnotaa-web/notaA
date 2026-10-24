import { and, asc, eq, sql } from 'drizzle-orm';
import type { AreaEnem, MapeamentoColunas, TipoImportacao } from '@notaa/contracts';
import {
  normalizarTexto,
  planejarAlunos,
  planejarDisciplinas,
  type AlunoExistente,
  type ContextoAlunos,
  type ContextoDisciplinas,
  type ItemPlanoAlunos,
  type ItemPlanoDisciplinas,
  type Planilha,
  type PlanoImportacao,
  type ResponsavelPlanejado,
} from '@notaa/importacao';
import type { Database, DbExecutor } from '../client';
import {
  alunoInstituicao,
  anoLetivoPeriodo,
  disciplina,
  responsavelAluno,
  turma,
} from '../schema';
import { registrarAuditoria, type EntradaAuditoria } from './auditoria.repository';

/** Quem está importando, para a auditoria. */
export interface AutorImportacao {
  instituicaoId: string;
  atorId: string;
  papel: string;
  importacaoId: string;
}

export interface ResultadoAplicacao {
  criados: number;
  atualizados: number;
  responsaveisVinculados: number;
}

export type PlanoPorTipo =
  | { tipo: 'alunos'; plano: PlanoImportacao<ItemPlanoAlunos> }
  | { tipo: 'disciplinas'; plano: PlanoImportacao<ItemPlanoDisciplinas> };

/**
 * Lado de banco da importação: carrega o que já existe (para o plano decidir
 * criar ou atualizar) e aplica o plano. O plano em si é puro, em
 * `@notaa/importacao`. Usado pela API (prévia, exportação) e pelo worker.
 */
export class ImportacaoRepositoryDb {
  constructor(private readonly db: Database) {}

  /**
   * O plano da importação contra o estado ATUAL do banco. A prévia chama
   * isto; o worker chama de novo na hora de gravar, para que o que mudou entre
   * a prévia e a confirmação (outra importação, cadastro manual) seja levado
   * em conta e reimportar nunca duplique.
   */
  async planejar(
    instituicaoId: string,
    tipo: TipoImportacao,
    planilha: Planilha,
    mapeamento: MapeamentoColunas,
  ): Promise<PlanoPorTipo> {
    if (tipo === 'alunos') {
      const contexto = await this.contextoAlunos(instituicaoId);
      return { tipo, plano: planejarAlunos(planilha, mapeamento, contexto) };
    }
    const contexto = await this.contextoDisciplinas(instituicaoId);
    return { tipo, plano: planejarDisciplinas(planilha, mapeamento, contexto) };
  }

  async contextoAlunos(instituicaoId: string): Promise<ContextoAlunos> {
    // Turma ativa = não arquivada, de ano letivo que a instituição não arquivou.
    const turmas = await this.db
      .select({ id: turma.id, nome: turma.nome })
      .from(turma)
      .leftJoin(
        anoLetivoPeriodo,
        and(
          eq(anoLetivoPeriodo.anoLetivoId, turma.anoLetivoId),
          eq(anoLetivoPeriodo.instituicaoId, turma.instituicaoId),
        ),
      )
      .where(
        and(
          eq(turma.instituicaoId, instituicaoId),
          eq(turma.arquivada, false),
          sql`coalesce(${anoLetivoPeriodo.arquivado}, false) = false`,
        ),
      );
    const turmasPorNome = new Map<string, string[]>();
    for (const t of turmas) {
      const chave = normalizarTexto(t.nome);
      turmasPorNome.set(chave, [...(turmasPorNome.get(chave) ?? []), t.id]);
    }

    const alunos = await this.db
      .select({
        id: alunoInstituicao.id,
        matricula: alunoInstituicao.matricula,
        nome: alunoInstituicao.nome,
        dataNascimento: alunoInstituicao.dataNascimento,
        email: alunoInstituicao.email,
        turmaId: alunoInstituicao.turmaId,
      })
      .from(alunoInstituicao)
      .where(eq(alunoInstituicao.instituicaoId, instituicaoId));
    const responsaveis = await this.db
      .select()
      .from(responsavelAluno)
      .where(eq(responsavelAluno.instituicaoId, instituicaoId));

    const porAluno = new Map<string, AlunoExistente['responsaveis']>();
    for (const r of responsaveis) {
      const lista = porAluno.get(r.alunoInstituicaoId) ?? [];
      lista.push({
        id: r.id,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        parentesco: r.parentesco,
        usuarioId: r.usuarioId,
      });
      porAluno.set(r.alunoInstituicaoId, lista);
    }
    const alunosPorMatricula = new Map<string, AlunoExistente>(
      alunos.map((a) => [
        a.matricula,
        {
          ...a,
          dataNascimento: a.dataNascimento ?? null,
          email: a.email ?? null,
          turmaId: a.turmaId ?? null,
          responsaveis: porAluno.get(a.id) ?? [],
        },
      ]),
    );

    return { turmasPorNome, alunosPorMatricula };
  }

  /**
   * Aplica um lote do plano numa transação. Idempotente: insere com
   * ON CONFLICT DO NOTHING na chave natural, então reaplicar o mesmo lote (ex.:
   * o worker caiu no meio e a importação voltou para a fila) não duplica.
   */
  async aplicarAlunos(
    itens: ItemPlanoAlunos[],
    autor: AutorImportacao,
  ): Promise<ResultadoAplicacao> {
    return this.db.transaction(async (tx) => {
      const resultado: ResultadoAplicacao = { criados: 0, atualizados: 0, responsaveisVinculados: 0 };
      const auditoria: EntradaAuditoria[] = [];
      // Só ids e nomes de campo: o audit_log é imutável, então nada que
      // identifique uma pessoa (e-mail, telefone, nome, matrícula, registro
      // anterior) entra aqui.
      const auditarVinculo = (
        alunoId: string,
        responsavelAlunoId: string,
        acao: 'responsavel.vinculado' | 'responsavel.atualizado',
        campos?: string[],
      ) =>
        auditoria.push({
          instituicaoId: autor.instituicaoId,
          atorId: autor.atorId,
          papel: autor.papel,
          acao,
          entidade: 'aluno_instituicao',
          entidadeId: alunoId,
          dados: {
            importacaoId: autor.importacaoId,
            responsavelAlunoId,
            ...(campos ? { campos } : {}),
          },
        });

      for (const item of itens) {
        const dados = item.dados;
        if (!dados) continue;
        const acao = item.previa.acao;
        if (acao === 'criar') {
          const [criado] = await tx
            .insert(alunoInstituicao)
            .values({ instituicaoId: autor.instituicaoId, ...dados })
            .onConflictDoNothing({ target: [alunoInstituicao.instituicaoId, alunoInstituicao.matricula] })
            .returning({ id: alunoInstituicao.id });
          if (!criado) continue;
          resultado.criados++;
          resultado.responsaveisVinculados += await this.inserirResponsaveis(
            tx,
            autor.instituicaoId,
            criado.id,
            item.responsaveisNovos,
            (responsavelId) => auditarVinculo(criado.id, responsavelId, 'responsavel.vinculado'),
          );
        } else if (acao === 'atualizar' && item.existenteId) {
          const alunoId = item.existenteId;
          if (Object.keys(item.camposAlterados).length > 0) {
            await tx
              .update(alunoInstituicao)
              .set({ ...item.camposAlterados, atualizadoEm: new Date() })
              .where(
                and(eq(alunoInstituicao.id, alunoId), eq(alunoInstituicao.instituicaoId, autor.instituicaoId)),
              );
          }
          resultado.responsaveisVinculados += await this.inserirResponsaveis(
            tx,
            autor.instituicaoId,
            alunoId,
            item.responsaveisNovos,
            (responsavelId) => auditarVinculo(alunoId, responsavelId, 'responsavel.vinculado'),
          );
          for (const { id, antes, depois } of item.responsaveisAlterados) {
            await tx
              .update(responsavelAluno)
              .set({
                nome: depois.nome,
                telefone: depois.telefone,
                parentesco: depois.parentesco,
                atualizadoEm: new Date(),
              })
              .where(and(eq(responsavelAluno.id, id), eq(responsavelAluno.instituicaoId, autor.instituicaoId)));
            const campos = (['nome', 'telefone', 'parentesco'] as const).filter((c) => antes[c] !== depois[c]);
            auditarVinculo(alunoId, id, 'responsavel.atualizado', campos);
          }
          resultado.atualizados++;
        }
      }
      await registrarAuditoria(tx, auditoria);
      return resultado;
    });
  }

  private async inserirResponsaveis(
    tx: DbExecutor,
    instituicaoId: string,
    alunoId: string,
    responsaveis: ResponsavelPlanejado[],
    auditar: (responsavelAlunoId: string) => void,
  ): Promise<number> {
    if (responsaveis.length === 0) return 0;
    const inseridos = await tx
      .insert(responsavelAluno)
      .values(
        responsaveis.map((r) => ({
          instituicaoId,
          alunoInstituicaoId: alunoId,
          nome: r.nome,
          email: r.email,
          telefone: r.telefone,
          parentesco: r.parentesco,
        })),
      )
      .onConflictDoNothing({ target: [responsavelAluno.alunoInstituicaoId, responsavelAluno.email] })
      .returning({ id: responsavelAluno.id });
    for (const { id } of inseridos) auditar(id);
    return inseridos.length;
  }

  async contextoDisciplinas(instituicaoId: string): Promise<ContextoDisciplinas> {
    const linhas = await this.db
      .select({
        id: disciplina.id,
        nome: disciplina.nome,
        codigo: disciplina.codigo,
        areaEnem: disciplina.areaEnem,
      })
      .from(disciplina)
      .where(eq(disciplina.instituicaoId, instituicaoId));
    return {
      porNome: new Map(
        linhas.map((d) => [
          normalizarTexto(d.nome),
          { ...d, codigo: d.codigo ?? null, areaEnem: (d.areaEnem as AreaEnem | null) ?? null },
        ]),
      ),
    };
  }

  async aplicarDisciplinas(
    itens: ItemPlanoDisciplinas[],
    autor: AutorImportacao,
  ): Promise<ResultadoAplicacao> {
    return this.db.transaction(async (tx) => {
      const resultado: ResultadoAplicacao = { criados: 0, atualizados: 0, responsaveisVinculados: 0 };
      for (const item of itens) {
        if (!item.dados) continue;
        if (item.previa.acao === 'criar') {
          const [criada] = await tx
            .insert(disciplina)
            .values({ instituicaoId: autor.instituicaoId, ...item.dados })
            .onConflictDoNothing({ target: [disciplina.instituicaoId, disciplina.nome] })
            .returning({ id: disciplina.id });
          if (criada) resultado.criados++;
        } else if (item.previa.acao === 'atualizar' && item.existenteId) {
          await tx
            .update(disciplina)
            .set({ ...item.camposAlterados, atualizadoEm: new Date() })
            .where(and(eq(disciplina.id, item.existenteId), eq(disciplina.instituicaoId, autor.instituicaoId)));
          resultado.atualizados++;
        }
      }
      return resultado;
    });
  }

  /** Cadastro de alunos no mesmo formato do modelo de importação (ida e volta). */
  async exportarAlunos(instituicaoId: string): Promise<(string | null)[][]> {
    const alunos = await this.db
      .select({
        id: alunoInstituicao.id,
        matricula: alunoInstituicao.matricula,
        nome: alunoInstituicao.nome,
        dataNascimento: alunoInstituicao.dataNascimento,
        email: alunoInstituicao.email,
        turma: turma.nome,
      })
      .from(alunoInstituicao)
      .leftJoin(turma, eq(turma.id, alunoInstituicao.turmaId))
      .where(eq(alunoInstituicao.instituicaoId, instituicaoId))
      .orderBy(asc(alunoInstituicao.matricula));
    const responsaveis = await this.db
      .select()
      .from(responsavelAluno)
      .where(eq(responsavelAluno.instituicaoId, instituicaoId))
      .orderBy(asc(responsavelAluno.criadoEm));
    const porAluno = new Map<string, typeof responsaveis>();
    for (const r of responsaveis) {
      porAluno.set(r.alunoInstituicaoId, [...(porAluno.get(r.alunoInstituicaoId) ?? []), r]);
    }
    // O modelo tem duas colunas de responsável; um terceiro, se houver, fica de fora.
    return alunos.map((a) => {
      const rs = (porAluno.get(a.id) ?? []).slice(0, 2);
      const colunasResp = [0, 1].flatMap((i) => {
        const r = rs[i];
        return [r?.nome ?? null, r?.email ?? null, r?.telefone ?? null, r?.parentesco ?? null];
      });
      return [a.matricula, a.nome, a.dataNascimento ?? null, a.email ?? null, a.turma ?? null, ...colunasResp];
    });
  }

  async exportarDisciplinas(instituicaoId: string): Promise<(string | null)[][]> {
    const linhas = await this.db
      .select({ nome: disciplina.nome, codigo: disciplina.codigo, areaEnem: disciplina.areaEnem })
      .from(disciplina)
      .where(eq(disciplina.instituicaoId, instituicaoId))
      .orderBy(asc(disciplina.nome));
    return linhas.map((d) => [d.nome, d.codigo ?? null, d.areaEnem ?? null]);
  }
}
