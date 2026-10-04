import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Req } from '@nestjs/common';
import {
  AtualizarAnoLetivoRequestSchema,
  CriarAnoLetivoRequestSchema,
  type AnoLetivo,
  type AtualizarAnoLetivoRequest,
  type CriarAnoLetivoRequest,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AnoLetivoService } from './ano-letivo.service';

/**
 * Ano letivo — só quem é dono de turma mexe nisto: admin de instituição e
 * professor independente. Professor institucional não aparece aqui porque ele
 * não cria nem arquiva nada; ele leciona no que a instituição definir.
 */
@Controller('ano-letivo')
@Roles('admin_instituicao', 'professor_independente')
export class AnoLetivoController {
  constructor(private readonly anoLetivo: AnoLetivoService) {}

  @Get()
  listar(@Req() req: AuthenticatedRequest): Promise<AnoLetivo[]> {
    return this.anoLetivo.listar(req.user.sub, req.user.app_metadata.papel);
  }

  @Post()
  criar(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarAnoLetivoRequestSchema)) body: CriarAnoLetivoRequest,
  ): Promise<AnoLetivo> {
    return this.anoLetivo.criar(req.user.sub, req.user.app_metadata.papel, body);
  }

  @Patch(':id')
  atualizar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AtualizarAnoLetivoRequestSchema)) body: AtualizarAnoLetivoRequest,
  ): Promise<AnoLetivo> {
    return this.anoLetivo.atualizar(req.user.sub, req.user.app_metadata.papel, id, body);
  }
}
