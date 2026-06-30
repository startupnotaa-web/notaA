import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';

// doc 05 §8 — Painel Administrador (MVP parcial). Stub: prova o caminho
// FORBIDDEN_ROLE do RolesGuard; dado real (LogUsoIA, gestão de usuários)
// entra com @notaa/db injetado (passo 9+) e o módulo crescer conforme E12.
@Controller('admin')
export class AdminController {
  @Roles('admin')
  @Get('users')
  listUsers() {
    return { items: [], nextCursor: null };
  }

  @Roles('admin')
  @Get('ai-usage')
  aiUsage() {
    return { items: [], nextCursor: null };
  }
}
