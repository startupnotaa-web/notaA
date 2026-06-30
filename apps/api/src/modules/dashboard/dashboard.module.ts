import { Module } from '@nestjs/common';
import { DashboardRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { GamificacaoModule } from '../gamificacao/gamificacao.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DASHBOARD_REPOSITORY } from './dashboard.tokens';

// E4 (Fase 1) — Dashboard Core: agrega θ (E2), XP/streak (E9) num só recurso (doc 05 §5).
@Module({
  imports: [GamificacaoModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new DashboardRepositoryDb(db),
    },
  ],
})
export class DashboardModule {}
