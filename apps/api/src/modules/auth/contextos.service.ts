import { Inject, Injectable } from '@nestjs/common';
import { Database, and, eq, instituicao, matriculaTurma, professorTurma, registrarAuditoria, turma, usuario, vinculoResponsavel } from '@notaa/db';
import { mesmoContexto, type ContextoDeAcesso, type ContextoListado, type Papel } from '@notaa/contracts';
import { DB_CLIENT } from '../../db/db.tokens';

const ROTULO_PESSOAL = 'Minha conta';

function ids(c: ContextoDeAcesso | null) {
  return c ? { papel: c.papel, instituicaoId: c.instituicaoId, estudanteId: c.estudanteId } : null;
}

/**
 * Contextos de acesso de uma conta: as instituições em que ela atua, ou os alunos de quem cuida.
 *
 * A lista sai SEMPRE dos vínculos reais no banco, nunca do que o cliente manda. O contexto não
 * concede nada: quem autoriza segue sendo o RBAC de rota + RLS + EscopoService. Serve para o
 * seletor "Entrar como…" e para o `ContextoGuard`, que revalida o contexto escolhido a cada
 * requisição.
 */
@Injectable()
export class ContextosService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  /** Ordem estável por rótulo; o primeiro é o contexto padrão. */
  async listar(usuarioId: string, papel: Papel): Promise<ContextoListado[]> {
    const lista = await this.buscar(usuarioId, papel);
    const unicos = lista.filter((c, i) => lista.findIndex((o) => mesmoContexto(o, c)) === i);
    return unicos.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }

  /** O contexto existe para esta conta, com este papel? */
  async existe(usuarioId: string, papel: Papel, contexto: ContextoDeAcesso): Promise<boolean> {
    if (contexto.papel !== papel) return false;
    const lista = await this.listar(usuarioId, papel);
    return lista.some((c) => mesmoContexto(c, contexto));
  }

  /**
   * Registra a escolha ou a troca de contexto. Só ids: nada de nome, e-mail ou rótulo. Vai com
   * `instituicao_id` nulo de propósito — a linha é da pessoa, não da instituição, e a trilha da
   * instituição (que o gestor lê) não deve mostrar por onde cada professor ou aluno circula.
   */
  async registrarTroca(
    usuarioId: string,
    papel: Papel,
    de: ContextoDeAcesso | null,
    para: ContextoDeAcesso,
  ): Promise<void> {
    await registrarAuditoria(this.db, {
      instituicaoId: null,
      atorId: usuarioId,
      papel,
      acao: 'contexto.trocado',
      entidade: 'contexto',
      entidadeId: null,
      dados: { de: ids(de), para: ids(para) },
    });
  }

  private async buscar(usuarioId: string, papel: Papel): Promise<ContextoListado[]> {
    const pessoal: ContextoListado = { papel, instituicaoId: null, estudanteId: null, rotulo: ROTULO_PESSOAL };
    const daInstituicao = (id: string, nome: string): ContextoListado => ({
      papel,
      instituicaoId: id,
      estudanteId: null,
      rotulo: nome,
    });

    switch (papel) {
      case 'estudante': {
        const linhas = await this.db
          .selectDistinct({ id: instituicao.id, nome: instituicao.nome })
          .from(matriculaTurma)
          .innerJoin(turma, eq(turma.id, matriculaTurma.turmaId))
          .innerJoin(instituicao, eq(instituicao.id, turma.instituicaoId))
          .where(and(eq(matriculaTurma.estudanteId, usuarioId), eq(matriculaTurma.status, 'ativa')));
        return linhas.length > 0 ? linhas.map((l) => daInstituicao(l.id, l.nome)) : [pessoal];
      }

      case 'professor_institucional': {
        const [propria] = await this.db
          .select({ id: instituicao.id, nome: instituicao.nome })
          .from(usuario)
          .innerJoin(instituicao, eq(instituicao.id, usuario.instituicaoId))
          .where(eq(usuario.id, usuarioId))
          .limit(1);
        const dasTurmas = await this.db
          .selectDistinct({ id: instituicao.id, nome: instituicao.nome })
          .from(professorTurma)
          .innerJoin(turma, eq(turma.id, professorTurma.turmaId))
          .innerJoin(instituicao, eq(instituicao.id, turma.instituicaoId))
          .where(eq(professorTurma.professorId, usuarioId));
        const todas = [...(propria ? [propria] : []), ...dasTurmas];
        return todas.length > 0 ? todas.map((l) => daInstituicao(l.id, l.nome)) : [pessoal];
      }

      case 'admin_instituicao': {
        const [propria] = await this.db
          .select({ id: instituicao.id, nome: instituicao.nome })
          .from(usuario)
          .innerJoin(instituicao, eq(instituicao.id, usuario.instituicaoId))
          .where(eq(usuario.id, usuarioId))
          .limit(1);
        return propria ? [daInstituicao(propria.id, propria.nome)] : [pessoal];
      }

      case 'responsavel': {
        const linhas = await this.db
          .select({ estudanteId: vinculoResponsavel.estudanteId, nome: usuario.nome })
          .from(vinculoResponsavel)
          .innerJoin(usuario, eq(usuario.id, vinculoResponsavel.estudanteId))
          .where(and(eq(vinculoResponsavel.responsavelId, usuarioId), eq(vinculoResponsavel.status, 'ativo')));
        return linhas.length > 0
          ? linhas.map((l) => ({
              papel,
              instituicaoId: null,
              estudanteId: l.estudanteId,
              rotulo: l.nome ?? 'Aluno',
            }))
          : [pessoal];
      }

      default:
        // professor independente e admin da plataforma: um contexto só.
        return [pessoal];
    }
  }
}
