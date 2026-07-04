import { Inject, Injectable } from '@nestjs/common';
import type { QuizRepositoryPort } from '@notaa/contracts';
import { GamificacaoRepositoryDb, QuizRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { QUIZ_REPOSITORY } from './quiz.tokens';

export interface QuizTxContext {
  quizRepo: QuizRepositoryPort;
  gamificacao: GamificacaoService;
}

/**
 * Unidade de trabalho do submitAnswer (auditoria E7): tentativa + theta + XP +
 * streak são UMA transação Postgres — falha no meio reverte tudo, e o UNIQUE de
 * `idempotency_key` passa a segurar requests concorrentes até o commit (um
 * reenvio simultâneo enxerga `duplicate=true` só DEPOIS que o XP do original
 * foi efetivado, eliminando estado parcial).
 *
 * Quando os repositórios ativos são os de memória (e2e/dev), não há transação a
 * abrir — executa o mesmo fluxo diretamente, preservando o comportamento.
 */
@Injectable()
export class QuizUnitOfWork {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: QuizRepositoryPort,
    private readonly gamificacao: GamificacaoService,
  ) {}

  async run<T>(fn: (ctx: QuizTxContext) => Promise<T>): Promise<T> {
    if (!(this.quizRepo instanceof QuizRepositoryDb)) {
      return fn({ quizRepo: this.quizRepo, gamificacao: this.gamificacao });
    }
    return this.db.transaction(async (tx) => {
      return fn({
        quizRepo: new QuizRepositoryDb(tx),
        gamificacao: new GamificacaoService(new GamificacaoRepositoryDb(tx)),
      });
    });
  }
}
