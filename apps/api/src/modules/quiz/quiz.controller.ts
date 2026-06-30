import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { StartQuizSessionRequestSchema, SubmitAnswerRequestSchema } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { QuizService } from './quiz.service';

// doc 05 §4 — Quiz adaptativo (E2). estudanteId SEMPRE vem do JWT (req.user.sub),
// nunca do corpo/params — corta de raiz qualquer tentativa de acessar sessão de
// outro usuário (doc 10 §1: "Estudante só acessa o próprio").
@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Post('sessions')
  startSession(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(StartQuizSessionRequestSchema))
    body: { area: 'linguagens' | 'humanas' | 'natureza' | 'matematica' },
  ) {
    return this.quiz.startSession(req.user.sub, body.area);
  }

  @Get('sessions/:id/next-item')
  nextItem(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quiz.nextItem(id, req.user.sub);
  }

  @Post('sessions/:id/answers')
  submitAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitAnswerRequestSchema))
    body: {
      itemId: string;
      respostaId: string;
      tempoRespostaMs: number;
    },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    // doc 05 §1: idempotência via header Idempotency-Key. Sem o header, cada
    // chamada é tratada como única (gera uma chave efêmera) — aceitável aqui
    // porque é o cliente quem deveria sempre enviá-lo; reforçar isso é tarefa
    // de validação de contrato HTTP, não de regra de negócio desta camada.
    const key = idempotencyKey ?? `sem-header:${id}:${body.itemId}:${Date.now()}`;
    return this.quiz.submitAnswer(id, req.user.sub, body, key);
  }

  @Post('sessions/:id/finish')
  finish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quiz.finishSession(id, req.user.sub);
  }
}
