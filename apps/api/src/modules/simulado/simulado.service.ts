import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { questoesEnem, type Database } from '@notaa/db';
import type { ImportQuestoesEnemRequest } from '@notaa/contracts';

@Injectable()
export class SimuladoService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

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
