import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ImportQuestoesEnemRequestSchema } from '@notaa/contracts';
import type { ImportQuestoesEnemRequest } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SimuladoService } from './simulado.service';

@Controller('simulado')
export class SimuladoController {
  constructor(private readonly simulado: SimuladoService) {}

  @Get('next-item')
  async getNextItem(
    @Req() req: AuthenticatedRequest,
    @Query('nivel') nivelStr?: string,
    @Query('excluir') excluirStr?: string,
  ) {
    let nivel: number | undefined;
    if (nivelStr !== undefined) {
      nivel = parseInt(nivelStr, 10);
      if (!Number.isFinite(nivel) || nivel < 1 || nivel > 3) {
        throw new BadRequestException({
          error: { code: 'VALIDATION_ERROR', message: '"nivel" deve ser 1, 2 ou 3.' },
        });
      }
    }
    const excluirIds = excluirStr ? excluirStr.split(',').filter(Boolean) : [];

    return this.simulado.getNextItem(req.user.sub, nivel, excluirIds);
  }

  @Roles('admin')
  @Post('import')
  async importQuestions(
    @Body(new ZodValidationPipe(ImportQuestoesEnemRequestSchema)) body: ImportQuestoesEnemRequest,
  ) {
    return this.simulado.importQuestions(body);
  }
}
