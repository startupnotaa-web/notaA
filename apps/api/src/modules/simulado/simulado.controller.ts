import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ImportQuestoesEnemRequestSchema, StartSimuladoSessionRequestSchema } from '@notaa/contracts';
import type { AreaConhecimento, ImportQuestoesEnemRequest, StartSimuladoSessionRequest } from '@notaa/contracts';
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
    @Query('area') area?: string,
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

    return this.simulado.getNextItem(req.user.sub, nivel, excluirIds, area as AreaConhecimento);
  }

  @Post('sessions')
  async startSession(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(StartSimuladoSessionRequestSchema)) body: StartSimuladoSessionRequest,
  ) {
    return this.simulado.startSession(req.user.sub, body.area, body.quantidade, body.nivel);
  }

  @Get('sessions/:id/next-item')
  async getSessionNextItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') sessaoId: string,
    @Query('nivel') nivelStr?: string,
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
    return this.simulado.getSessionNextItem(sessaoId, req.user.sub, nivel);
  }

  @Roles('admin')
  @Post('import')
  async importQuestions(
    @Body(new ZodValidationPipe(ImportQuestoesEnemRequestSchema)) body: ImportQuestoesEnemRequest,
  ) {
    return this.simulado.importQuestions(body);
  }
}
