import { Module } from '@nestjs/common';
import { GamificacaoRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { GamificacaoController } from './gamificacao.controller';
import { GamificacaoService } from './gamificacao.service';
import { GAMIFICACAO_REPOSITORY } from './gamificacao.tokens';

// E9 (Fase 1) — XP Ledger append-only + Streak + Conquistas (doc 04 §7).
@Module({
  controllers: [GamificacaoController],
  providers: [
    GamificacaoService,
    {
      provide: GAMIFICACAO_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new GamificacaoRepositoryDb(db),
    },
  ],
  exports: [GamificacaoService],
})
export class GamificacaoModule {}
