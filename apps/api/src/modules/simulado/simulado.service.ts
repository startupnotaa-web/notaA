import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import { type Database, questoesEnem } from '@notaa/db';
import { eq, sql } from '@notaa/db';

@Injectable()
export class SimuladoService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getNextItem(nivel: number) {
    let dificuldadeTri: 'facil' | 'media' | 'dificil' = 'media';
    if (nivel === 1) dificuldadeTri = 'facil';
    else if (nivel === 3) dificuldadeTri = 'dificil';

    const questoes = await this.db.select()
      .from(questoesEnem)
      .where(eq(questoesEnem.dificuldadeTri, dificuldadeTri))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (questoes.length === 0) {
      // Fallback para mock se o banco estiver vazio durante testes
      return this.getMockFallback(nivel);
    }

    const q = questoes[0];

    return {
      id: q.id,
      area: q.area,
      enunciado: q.enunciado,
      // Espera-se que alternativas venham como um array de strings ["Opção A", "Opção B", ...]
      alternativas: (q.alternativas as string[]).map((alt, index) => ({
        id: String.fromCharCode(97 + index), // 'a', 'b', 'c', ...
        texto: alt,
        correta: index === q.correta
      })),
      nivel: nivel,
      explicacao: 'Resolução detalhada indisponível para questões do banco público.',
      dicaPerfil: 'Esta é uma questão real do ENEM/Vestibulares. Pratique com atenção!'
    };
  }

  async importQuestions(payload: any) {
    let questoes = payload;
    if (!Array.isArray(questoes)) {
      if (payload.questoes && Array.isArray(payload.questoes)) {
        questoes = payload.questoes;
      } else {
        throw new BadRequestException('Payload deve ser um array ou conter a chave "questoes".');
      }
    }

    const values = questoes.map((item: any) => ({
      area: item.area,
      ano: item.ano || new Date().getFullYear(),
      textoBase: item.textoBase || null,
      enunciado: item.enunciado,
      alternativas: item.alternativas,
      correta: item.correta,
      dificuldadeTri: item.dificuldadeTri || 'media',
      habilidadeBncc: item.habilidadeBncc || null,
    }));

    if (values.length === 0) {
      throw new BadRequestException('Nenhuma questão válida para importar.');
    }

    const result = await this.db.insert(questoesEnem).values(values).returning({ id: questoesEnem.id });
    return { inseridas: result.length, ids: result.map(r => r.id) };
  }

  private getMockFallback(nivel: number) {
    const diffLabel = nivel === 1 ? 'Fácil' : nivel === 2 ? 'Média' : 'Difícil';
    return {
      id: `fallback-${Date.now()}`,
      area: 'matematica',
      enunciado: `[Fallback - Banco Vazio] Questão de dificuldade ${diffLabel}`,
      alternativas: [
        { id: 'a', texto: 'Alternativa A (Correta)', correta: true },
        { id: 'b', texto: 'Alternativa B', correta: false },
        { id: 'c', texto: 'Alternativa C', correta: false },
        { id: 'd', texto: 'Alternativa D', correta: false },
        { id: 'e', texto: 'Alternativa E', correta: false },
      ],
      nivel: nivel,
      explicacao: 'Você está vendo esta questão pois a tabela questoes_enem está vazia.',
      dicaPerfil: 'Importe questões usando o endpoint /simulado/import'
    };
  }
}
