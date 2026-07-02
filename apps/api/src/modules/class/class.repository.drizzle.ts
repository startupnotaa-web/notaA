import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import {
  turma,
  matriculaTurma,
  usuario,
  streak,
  xpLedger,
  tentativaResposta,
  bancoDeItens,
  eq,
  inArray,
  sql,
} from '@notaa/db';
import type { StudentRisk } from '@notaa/contracts';

@Injectable()
export class ClassRepository {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getAlunosPorProfessor(professorId: string) {
    const turmas = await this.db.select({
      turmaId: turma.id,
      estudanteId: matriculaTurma.estudanteId
    })
    .from(turma)
    .innerJoin(matriculaTurma, eq(turma.id, matriculaTurma.turmaId))
    .where(eq(turma.professorId, professorId));

    if (!turmas.length) return [];

    const estudanteIds = turmas.map(t => t.estudanteId);
    return [...new Set(estudanteIds)];
  }

  async getAlunosRiscosData(estudanteIds: string[]): Promise<StudentRisk[]> {
    if (!estudanteIds.length) return [];

    const dados = await this.db.select({
      id: usuario.id,
      nome: usuario.nome,
      streak: streak.diasConsecutivos,
      xpTotal: sql<number>`COALESCE(SUM(${xpLedger.valor}), 0)`
    })
    .from(usuario)
    .leftJoin(streak, eq(usuario.id, streak.estudanteId))
    .leftJoin(xpLedger, eq(usuario.id, xpLedger.estudanteId))
    .where(inArray(usuario.id, estudanteIds))
    .groupBy(usuario.id, usuario.nome, streak.diasConsecutivos);

    return dados.map((d) => {
      const dias = d.streak || 0;
      let risco: 'alto' | 'medio' | 'baixo' = 'baixo';
      let motivo = '';
      if (dias < 2) {
        risco = 'alto';
        motivo = 'Ofensiva quase zerada (baixo engajamento)';
      } else if (dias <= 5) {
        risco = 'medio';
        motivo = 'Precisa de encorajamento para manter a ofensiva';
      } else {
        risco = 'baixo';
        motivo = 'Ótimo engajamento!';
      }
      return {
        id: d.id,
        nome: d.nome || 'Sem Nome',
        streak: dias,
        xpTotal: Number(d.xpTotal),
        risco,
        motivo
      };
    });
  }

  async getAreaMaisFragil(estudanteIds: string[]) {
    if (!estudanteIds.length) return null;

    const stats = await this.db.select({
      area: bancoDeItens.areaConhecimento,
      mediaAcertos: sql<number>`AVG(CASE WHEN ${tentativaResposta.acerto} THEN 1.0 ELSE 0.0 END)`
    })
    .from(tentativaResposta)
    .innerJoin(bancoDeItens, eq(tentativaResposta.itemId, bancoDeItens.id))
    .where(inArray(tentativaResposta.estudanteId, estudanteIds))
    .groupBy(bancoDeItens.areaConhecimento);

    if (!stats.length) return null;

    let lowest = stats[0]!;
    for (const stat of stats) {
      if (Number(stat.mediaAcertos) < Number(lowest.mediaAcertos)) {
        lowest = stat;
      }
    }

    return {
      area: lowest.area,
      mediaAcertos: Number(lowest.mediaAcertos)
    };
  }
}
