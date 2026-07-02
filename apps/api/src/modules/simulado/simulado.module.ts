import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';

@Module({
  imports: [DbModule],
  controllers: [SimuladoController],
  providers: [SimuladoService],
})
export class SimuladoModule {}
