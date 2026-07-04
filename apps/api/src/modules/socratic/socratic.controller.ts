import { Body, Controller, Get, Param, Post, Req, UseInterceptors } from '@nestjs/common';
import {
  OpenSocraticSessionRequestSchema,
  SendSocraticMessageRequestSchema,
} from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RateLimitIA, RateLimiterInterceptor } from '../ai/rate-limiter/rate-limiter.interceptor';
import { SocraticService } from './socratic.service';

// doc 05 §7 — IA Socrática (E8). estudanteId SEMPRE vem do JWT (req.user.sub),
// nunca do corpo/params — mesma regra de isolamento do QuizController (doc 10 §1).
@Controller('socratic')
export class SocraticController {
  constructor(private readonly socratic: SocraticService) {}

  /**
   * Retorna o histórico de conversas socráticas (todas as sessões salvas).
   */
  @Get('history')
  async listHistory(@Req() req: AuthenticatedRequest) {
    const historico = await this.socratic.listarHistorico(req.user.sub);
    return { historico };
  }

  /**
   * Abre uma nova sessão de conversa socrática.
   * Opcionalmente vinculada a um tema ou a uma sessão de quiz.
   */
  @Post('sessions')
  openSession(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(OpenSocraticSessionRequestSchema))
    body: { temaAtivo?: string; itemId?: string },
  ) {
    return this.socratic.abrirSessao(req.user.sub, {
      temaAtivo: body.temaAtivo,
      sessaoId: body.itemId,
    });
  }

  /**
   * Envia mensagem do estudante e recebe a resposta guiada do tutor IA.
   * O Perfil 4D é injetado automaticamente — o estudante não controla o contexto.
   */
  @Post('sessions/:id/messages')
  @UseInterceptors(RateLimiterInterceptor)
  @RateLimitIA('socratica')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversaId: string,
    @Body(new ZodValidationPipe(SendSocraticMessageRequestSchema))
    body: { mensagem: string },
  ) {
    return this.socratic.enviarMensagem(conversaId, req.user.sub, body.mensagem);
  }

  /**
   * Retorna o histórico de mensagens (sem mensagens de sistema internas).
   */
  @Get('sessions/:id/messages')
  listMessages(@Req() req: AuthenticatedRequest, @Param('id') conversaId: string) {
    return this.socratic.listarMensagens(conversaId, req.user.sub);
  }

  /**
   * Tutor socrático DIRETO (stateless) — usa o Gemini real com o contexto do
   * aluno (onboarding + Perfil 4D). Protegida pelo AuthGuard global: o
   * estudanteId vem SEMPRE do JWT (req.user.sub), nunca do corpo.
   */
  @Post('chat')
  @UseInterceptors(RateLimiterInterceptor)
  @RateLimitIA('socratica')
  chat(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(SendSocraticMessageRequestSchema))
    body: { mensagem: string },
  ) {
    return this.socratic.chatDireto(req.user.sub, body.mensagem);
  }
}
