import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { DesempenhoModule } from '../desempenho/desempenho.module';
import { EscopoModule } from '../escopo/escopo.module';
import { ConviteProfessorController } from './convite-professor.controller';
import { InstituicaoController } from './instituicao.controller';
import { InstituicaoService } from './instituicao.service';
import { ProfessoresController } from './professores.controller';
import { ProfessoresService } from './professores.service';

/**
 * Painel da instituição.
 *
 * Importa AuthModule porque o convite de professor termina criando uma conta, e
 * criar conta é responsabilidade do AuthService. A dependência é de mão única:
 * auth não sabe o que é convite nem instituição.
 */
@Module({
  imports: [DbModule, EscopoModule, DesempenhoModule, AuthModule],
  controllers: [InstituicaoController, ProfessoresController, ConviteProfessorController],
  providers: [InstituicaoService, ProfessoresService],
  exports: [InstituicaoService, ProfessoresService],
})
export class InstituicaoModule {}
