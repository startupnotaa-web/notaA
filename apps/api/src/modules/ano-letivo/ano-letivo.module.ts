import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EscopoModule } from '../escopo/escopo.module';
import { AnoLetivoController } from './ano-letivo.controller';
import { AnoLetivoService } from './ano-letivo.service';

@Module({
  imports: [DbModule, EscopoModule],
  controllers: [AnoLetivoController],
  providers: [AnoLetivoService],
  exports: [AnoLetivoService],
})
export class AnoLetivoModule {}
