import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';

// doc 05 §8 — Portal da Escola (MVP parcial). Stub estrutural; dado agregado
// real (sem expor dado sensível — I10) entra com @notaa/db (passo 9+) e o
// módulo crescer conforme E11.
@Controller('escola')
export class EscolaController {
  @Roles('gestor')
  @Get('overview')
  overview() {
    return { kpis: null };
  }

  @Roles('gestor', 'professor')
  @Get('turmas/:id/desempenho')
  desempenhoTurma() {
    return { desempenho: null };
  }
}
