import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EscopoModule } from '../escopo/escopo.module';
import { ARMAZENAMENTO_PLANILHAS, ArmazenamentoSupabase } from './armazenamento';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';

@Module({
  imports: [DbModule, EscopoModule],
  controllers: [ImportacaoController],
  providers: [
    ImportacaoService,
    { provide: ARMAZENAMENTO_PLANILHAS, useClass: ArmazenamentoSupabase },
  ],
})
export class ImportacaoModule {}
