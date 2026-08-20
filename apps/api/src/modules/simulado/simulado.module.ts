import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { AiModule } from '../ai/ai.module';
import { GamificacaoModule } from '../gamificacao/gamificacao.module';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { SimuladoSessaoService } from './simulado-sessao.service';

// AiModule: completa as questões que o banco público do ENEM não cobre.
// GamificacaoModule: lançamento de XP no fim da prova.
@Module({
  imports: [DbModule, AiModule, GamificacaoModule],
  controllers: [SimuladoController],
  providers: [SimuladoService, SimuladoSessaoService],
})
export class SimuladoModule {}
