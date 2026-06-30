import { Module } from '@nestjs/common';
import { QuizRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { ErrorDetectorModule } from '../error-detector/error-detector.module';
import { GamificacaoModule } from '../gamificacao/gamificacao.module';
import { ProfilerModule } from '../profiler/profiler.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QUIZ_REPOSITORY } from './quiz.tokens';

@Module({
  imports: [GamificacaoModule, ProfilerModule, ErrorDetectorModule],
  controllers: [QuizController],
  providers: [
    QuizService,
    {
      provide: QUIZ_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new QuizRepositoryDb(db),
    },
  ],
})
export class QuizModule {}
