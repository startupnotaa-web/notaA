import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EscopoModule } from '../escopo/escopo.module';
import { DesempenhoRepository } from './desempenho.repository';
import { DetalheAlunoRepository } from './detalhe-aluno.repository';
import { IndicadoresService } from './indicadores.service';

/**
 * Métricas de desempenho com janela de dados, compartilhadas pelo painel do
 * professor e pelo da instituição. Sem controller: não existe rota de
 * "desempenho", existem métricas consumidas pelas rotas dos dois painéis.
 */
@Module({
  imports: [DbModule, EscopoModule],
  providers: [DesempenhoRepository, DetalheAlunoRepository, IndicadoresService],
  exports: [DesempenhoRepository, DetalheAlunoRepository, IndicadoresService],
})
export class DesempenhoModule {}
