import { Module } from '@nestjs/common';
import { ProfilerRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { ProfilerController } from './profiler.controller';
import { ProfilerService } from './profiler.service';
import { PROFILER_REPOSITORY } from './profiler.tokens';

// E3 (Fase 1) — Cognitive Profiler (doc 04 §3).
@Module({
  controllers: [ProfilerController],
  providers: [
    ProfilerService,
    {
      provide: PROFILER_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new ProfilerRepositoryDb(db),
    },
  ],
  exports: [ProfilerService],
})
export class ProfilerModule {}
