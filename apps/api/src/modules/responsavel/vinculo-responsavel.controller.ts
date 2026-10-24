import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { ListaVinculosPendentes, VinculoDecidido } from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { VinculoResponsavelService } from './vinculo-responsavel.service';

/**
 * Vínculos de responsável que o e-mail não confirmou: gestão e coordenação
 * aprovam ou recusam. A instituição vem do banco, pelo usuário do token.
 */
@Controller('instituicao/vinculos-responsavel')
@Roles('admin_instituicao')
export class VinculoResponsavelController {
  constructor(private readonly vinculos: VinculoResponsavelService) {}

  @Get('pendentes')
  pendentes(@Req() req: AuthenticatedRequest): Promise<ListaVinculosPendentes> {
    return this.vinculos.listarPendentes(req.user.sub);
  }

  @Post(':id/aprovar')
  @HttpCode(200)
  aprovar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VinculoDecidido> {
    return this.vinculos.aprovar(req.user.sub, req.user.app_metadata.papel, id);
  }

  @Post(':id/recusar')
  @HttpCode(200)
  recusar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VinculoDecidido> {
    return this.vinculos.recusar(req.user.sub, req.user.app_metadata.papel, id);
  }
}
