import { Module } from '@nestjs/common';
import { ErrorDetectorRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { ErrorDetectorService } from './error-detector.service';
import { ERROR_DETECTOR_REPOSITORY } from './error-detector.tokens';

// Fase 2 (E5) — Detector de Padrão de Erro (doc 04 §5).
@Module({
  providers: [
    ErrorDetectorService,
    {
      provide: ERROR_DETECTOR_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new ErrorDetectorRepositoryDb(db),
    },
  ],
  exports: [ErrorDetectorService],
})
export class ErrorDetectorModule {}
