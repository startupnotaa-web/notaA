import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ProfilerService } from './profiler.service';

// doc 05 §5 — Cognitive Profiler (E3). Atualização é server-side (hook em
// QuizService); cliente só lê (H3.1 — "sem questionário extra repetitivo").
@Controller('me')
export class ProfilerController {
  constructor(private readonly profiler: ProfilerService) {}

  @Get('cognitive-profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.profiler.getPerfil(req.user.sub);
  }
}
