import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { DesempenhoModule } from '../desempenho/desempenho.module';
import { EscopoModule } from '../escopo/escopo.module';
import { MinhasTurmasController } from './minhas-turmas.controller';
import { TurmaController } from './turma.controller';
import { TurmaService } from './turma.service';

@Module({
  imports: [DbModule, EscopoModule, DesempenhoModule],
  controllers: [TurmaController, MinhasTurmasController],
  providers: [TurmaService],
  exports: [TurmaService],
})
export class TurmaModule {}
