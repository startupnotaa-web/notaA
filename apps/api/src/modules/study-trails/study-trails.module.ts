import { Module } from '@nestjs/common';
import { StudyTrailsController } from './study-trails.controller';
import { StudyTrailsService } from './study-trails.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [StudyTrailsController],
  providers: [StudyTrailsService],
  exports: [StudyTrailsService],
})
export class StudyTrailsModule {}
