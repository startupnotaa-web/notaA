import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ImportQuestoesEnemRequestSchema,
  SaveSimuladoAnswerRequestSchema,
  StartSimuladoRequestSchema,
} from '@notaa/contracts';
import type {
  ImportQuestoesEnemRequest,
  SaveSimuladoAnswerRequest,
  StartSimuladoRequest,
} from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SimuladoService } from './simulado.service';
import { SimuladoSessaoService } from './simulado-sessao.service';

@Controller('simulado')
export class SimuladoController {
  constructor(
    private readonly simulado: SimuladoService,
    private readonly sessao: SimuladoSessaoService,
  ) {}

  /** Cria a prova inteira de uma vez — 40 questões, sem gabarito. */
  @Post('sessions')
  async start(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(StartSimuladoRequestSchema)) body: StartSimuladoRequest,
  ) {
    return this.sessao.start(req.user.sub, body.modo, body.limiteMinutos, body.idiomaEstrangeiro);
  }

  /**
   * Grava a resposta SEM revelar acerto — o feedback só existe no relatório
   * final (é o que diferencia simulado de quiz).
   */
  @Post('sessions/:id/answers')
  async saveAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('id') sessaoId: string,
    @Body(new ZodValidationPipe(SaveSimuladoAnswerRequestSchema)) body: SaveSimuladoAnswerRequest,
  ) {
    return this.sessao.saveAnswer(sessaoId, req.user.sub, body);
  }

  /** Retoma uma prova em andamento — mesma ordem, respostas já marcadas. */
  @Get('sessions/:id')
  async resume(@Req() req: AuthenticatedRequest, @Param('id') sessaoId: string) {
    return this.sessao.retomar(sessaoId, req.user.sub);
  }

  @Post('sessions/:id/finish')
  async finish(@Req() req: AuthenticatedRequest, @Param('id') sessaoId: string) {
    return this.sessao.finish(sessaoId, req.user.sub);
  }

  @Get('sessions/:id/report')
  async report(@Req() req: AuthenticatedRequest, @Param('id') sessaoId: string) {
    return this.sessao.relatorio(sessaoId, req.user.sub);
  }

  @Roles('admin')
  @Post('import')
  async importQuestions(
    @Body(new ZodValidationPipe(ImportQuestoesEnemRequestSchema)) body: ImportQuestoesEnemRequest,
  ) {
    return this.simulado.importQuestions(body);
  }
}
