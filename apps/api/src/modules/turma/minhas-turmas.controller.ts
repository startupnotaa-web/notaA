import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  EntrarNaTurmaRequestSchema,
  type EntrarNaTurmaRequest,
  type MinhaTurma,
  type PreviaConvite,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TurmaService } from './turma.service';

/**
 * Turma, lado do aluno. Vive sob `/me` porque é tudo sobre o próprio usuário —
 * mesma convenção de /me/dashboard e /me/xp.
 *
 * Entrar em turma é opcional: o aluno usa a plataforma inteira sem nenhuma.
 */
@Controller('me')
@Roles('estudante')
export class MinhasTurmasController {
  constructor(private readonly turma: TurmaService) {}

  /** As turmas do aluno, ativas e pendentes de aprovação. */
  @Get('turmas')
  minhasTurmas(@Req() req: AuthenticatedRequest): Promise<MinhaTurma[]> {
    return this.turma.minhasTurmas(req.user.sub);
  }

  /**
   * Prévia antes de confirmar: nome da turma, ano letivo e de quem ela é.
   * perfis.md exige essa conferência antes de o aluno enviar a solicitação.
   */
  @Get('turmas/convite/:codigo')
  previa(@Param('codigo') codigo: string): Promise<PreviaConvite> {
    return this.turma.previaConvite(codigo);
  }

  /**
   * Envia a solicitação de entrada. Nasce pendente: um professor da turma (ou o
   * admin da instituição) precisa aprovar, e até lá o aluno não aparece nos dados
   * da turma. O corpo exige consentimento explícito.
   */
  @Post('turmas/convite')
  entrar(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(EntrarNaTurmaRequestSchema)) body: EntrarNaTurmaRequest,
  ): Promise<MinhaTurma> {
    return this.turma.entrarNaTurma(req.user.sub, body.codigo);
  }
}
