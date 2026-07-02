import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { SimuladoService } from './simulado.service';

@Controller('simulado')
export class SimuladoController {
  constructor(private readonly simulado: SimuladoService) {}

  @Get('next-item')
  async getNextItem(
    @Req() req: AuthenticatedRequest,
    @Query('nivel') nivelStr?: string,
  ) {
    const nivel = nivelStr ? parseInt(nivelStr, 10) : 2;
    return this.simulado.getNextItem(nivel);
  }

  @Post('import')
  async importQuestions(@Body() body: any) {
    return this.simulado.importQuestions(body);
  }
}
