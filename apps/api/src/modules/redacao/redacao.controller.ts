import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateRedacaoRequestSchema } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RedacaoService } from './redacao.service';

// doc 05 §6 — Redação (E7). estudanteId SEMPRE vem do JWT (req.user.sub).
@Controller('redacao')
export class RedacaoController {
  constructor(private readonly redacao: RedacaoService) {}

  /**
   * Submete uma redação para correção IA.
   * O body aceita `temaId` (tema catalogado) OU `temaLivre` (tema livre),
   * nunca ambos (validado pelo schema, doc 05 §6).
   */
  @Post()
  submeter(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateRedacaoRequestSchema))
    body: { texto: string; temaId?: string; temaLivre?: string },
  ) {
    return this.redacao.submeterRedacao(req.user.sub, body);
  }

  /**
   * Busca o resultado da correção de uma redação.
   * Retorna 404 se a redação não pertencer ao estudante autenticado.
   */
  @Get(':id')
  buscarAvaliacao(@Req() req: AuthenticatedRequest, @Param('id') redacaoId: string) {
    return this.redacao.buscarAvaliacao(redacaoId, req.user.sub);
  }
}
