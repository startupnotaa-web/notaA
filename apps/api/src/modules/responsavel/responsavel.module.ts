import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EscopoModule } from '../escopo/escopo.module';
import {
  ConviteResponsavelAdminController,
  ConviteResponsavelController,
} from './convite-responsavel.controller';
import { ConviteResponsavelService } from './convite-responsavel.service';

@Module({
  imports: [DbModule, EscopoModule],
  controllers: [ConviteResponsavelAdminController, ConviteResponsavelController],
  providers: [ConviteResponsavelService],
})
export class ResponsavelModule {}
