import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import {
  AceitarConviteResponsavelRequestSchema,
  type AceitarConviteResponsavelRequest,
  type ConviteResponsavelAceito,
  type ConviteResponsavelCriado,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ConviteResponsavelService } from './convite-responsavel.service';

/**
 * Lado da instituição: gestão e coordenação emitem o convite. A instituição vem
 * do banco, pelo usuário do token, e o contato tem que ser dela.
 */
@Controller('instituicao/responsaveis')
@Roles('admin_instituicao')
export class ConviteResponsavelAdminController {
  constructor(private readonly convites: ConviteResponsavelService) {}

  @Post(':responsavelAlunoId/convites')
  @HttpCode(201)
  criar(
    @Req() req: AuthenticatedRequest,
    @Param('responsavelAlunoId', ParseUUIDPipe) responsavelAlunoId: string,
  ): Promise<ConviteResponsavelCriado> {
    return this.convites.criarConvite(req.user.sub, req.user.app_metadata.papel, responsavelAlunoId);
  }
}

/** Lado da família: o responsável autenticado aceita o convite e o termo. */
@Controller('responsavel/convites')
@Roles('responsavel')
export class ConviteResponsavelController {
  constructor(private readonly convites: ConviteResponsavelService) {}

  @Post('aceitar')
  @HttpCode(200)
  aceitar(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(AceitarConviteResponsavelRequestSchema))
    body: AceitarConviteResponsavelRequest,
  ): Promise<ConviteResponsavelAceito> {
    return this.convites.aceitarConvite(req.user.sub, req.user.email, body);
  }
}
