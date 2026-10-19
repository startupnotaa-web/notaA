import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EscopoModule } from '../escopo/escopo.module';
import { AcademicoController } from './academico.controller';
import { AcademicoService } from './academico.service';

@Module({
  imports: [DbModule, EscopoModule],
  controllers: [AcademicoController],
  providers: [AcademicoService],
})
export class AcademicoModule {}
