import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { and, eq, habilidadeEstudante, notInArray, questoesEnem, sql, type Database } from '@notaa/db';
import type { DificuldadeTri, ImportQuestoesEnemRequest, QuestaoSimuladoResponse } from '@notaa/contracts';

function nivelParaDificuldade(nivel: number): DificuldadeTri {
  if (nivel <= 1) return 'facil';
  if (nivel >= 3) return 'dificil';
  return 'media';
}

function toQuestaoPublica(row: typeof questoesEnem.$inferSelect, nivel: number): QuestaoSimuladoResponse {
  const alternativas = row.alternativas as string[];
  return {
    id: row.id,
    area: row.area,
    enunciado: row.enunciado,
    alternativas: alternativas.map((texto, index) => ({
      id: String.fromCharCode(97 + index), // 'a', 'b', 'c', ...
      texto,
      correta: index === row.correta,
    })),
    nivel,
    explicacao: 'Resolução detalhada indisponível para questões do banco público.',
    dicaPerfil: 'Esta é uma questão real do ENEM/Vestibulares. Pratique com atenção!',
    imagemUrl: row.imagemUrl,
  };
}

@Injectable()
export class SimuladoService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getNextItem(
    estudanteId: string,
    nivelSolicitado: number | undefined,
    excluirIds: string[],
  ): Promise<QuestaoSimuladoResponse> {
    const nivel = nivelSolicitado ?? (await this.inferirNivelInicial(estudanteId));
    const dificuldadeTri = nivelParaDificuldade(nivel);

    const condicoes = [eq(questoesEnem.dificuldadeTri, dificuldadeTri)];
    if (excluirIds.length > 0) condicoes.push(notInArray(questoesEnem.id, excluirIds));

    const [questao] = await this.db
      .select()
      .from(questoesEnem)
      .where(and(...condicoes))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (!questao) {
      throw new NotFoundException({
        error: {
          code: 'BANCO_ENEM_ESGOTADO',
          message: `Não há mais questões de dificuldade "${dificuldadeTri}" disponíveis no banco do ENEM para este simulado.`,
        },
      });
    }

    return toQuestaoPublica(questao, nivel);
  }

  /**
   * Proficiência inicial do simulado (Missão 2) — média do theta TRI do aluno
   * em todas as áreas já tentadas, convertida para a faixa 1-3 (fácil/média/difícil).
   * Sem histórico (1º simulado do aluno), começa em "média" — heurística de
   * produto, não dado oficial a calibrar.
   */
  private async inferirNivelInicial(estudanteId: string): Promise<number> {
    const habilidades = await this.db
      .select({ theta: habilidadeEstudante.theta })
      .from(habilidadeEstudante)
      .where(eq(habilidadeEstudante.estudanteId, estudanteId));

    if (habilidades.length === 0) return 2;

    const media = habilidades.reduce((acc, h) => acc + Number(h.theta), 0) / habilidades.length;
    if (media <= -1) return 1;
    if (media >= 1) return 3;
    return 2;
  }

  async importQuestions(payload: ImportQuestoesEnemRequest) {
    const questoes = Array.isArray(payload) ? payload : payload.questoes;

    const values = questoes.map((item) => ({
      area: item.area,
      ano: item.ano ?? new Date().getFullYear(),
      textoBase: item.textoBase ?? null,
      enunciado: item.enunciado,
      alternativas: item.alternativas,
      correta: item.correta,
      dificuldadeTri: item.dificuldadeTri ?? 'media',
      habilidadeBncc: item.habilidadeBncc ?? null,
      imagemUrl: item.imagemUrl ?? null,
    }));

    const result = await this.db.insert(questoesEnem).values(values).returning({ id: questoesEnem.id });
    return { inseridas: result.length, ids: result.map((r) => r.id) };
  }
}
