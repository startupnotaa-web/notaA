import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { DbModule } from '../../db/db.module';
import { DesempenhoModule } from '../desempenho/desempenho.module';
import { EscopoModule } from '../escopo/escopo.module';

@Module({
  imports: [DbModule, EscopoModule, DesempenhoModule],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
