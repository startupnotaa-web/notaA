import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  CriarConviteProfessorRequestSchema,
  type ConviteProfessor,
  type CriarConviteProfessorRequest,
  type ProfessorDaInstituicao,
  type RemoverProfessorResponse,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProfessoresService } from './professores.service';

/**
 * Gestão do quadro de professores — só o admin da instituição.
 *
 * O professor institucional não aparece como papel permitido em nenhuma rota
 * daqui, nem para leitura: quem leciona não administra o quadro.
 */
@Controller('instituicao/professores')
@Roles('admin_instituicao')
export class ProfessoresController {
  constructor(private readonly professores: ProfessoresService) {}

  @Get()
  listar(@Req() req: AuthenticatedRequest): Promise<ProfessorDaInstituicao[]> {
    return this.professores.listar(req.user.sub);
  }

  /** Remove o vínculo institucional. A conta do professor não é apagada. */
  @Delete(':professorId')
  remover(
    @Req() req: AuthenticatedRequest,
    @Param('professorId', ParseUUIDPipe) professorId: string,
  ): Promise<RemoverProfessorResponse> {
    return this.professores.remover(req.user.sub, professorId);
  }

  @Get('convites')
  listarConvites(@Req() req: AuthenticatedRequest): Promise<ConviteProfessor[]> {
    return this.professores.listarConvites(req.user.sub);
  }

  /** Gera o convite. A tela monta o link com o token devolvido e o entrega. */
  @Post('convites')
  criarConvite(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarConviteProfessorRequestSchema))
    body: CriarConviteProfessorRequest,
  ): Promise<ConviteProfessor> {
    return this.professores.criarConvite(req.user.sub, body.email);
  }

  @Delete('convites/:conviteId')
  @HttpCode(204)
  revogarConvite(
    @Req() req: AuthenticatedRequest,
    @Param('conviteId', ParseUUIDPipe) conviteId: string,
  ): Promise<void> {
    return this.professores.revogarConvite(req.user.sub, conviteId);
  }
}
