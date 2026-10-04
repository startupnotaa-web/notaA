import { Controller, Get, Req } from '@nestjs/common';
import { ClassService } from './class.service';
import type { ClassAnalyticsResponse, IndicadorDeTurma } from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * Painel do professor. Os dois papéis que lecionam entram; QUAIS turmas cada
   * um vê é resolvido no serviço, pelo vínculo em `professor_turma`.
   *
   * A restrição vive em @Roles(), e não numa checagem à mão no corpo do método,
   * por dois motivos. Primeiro, a checagem antiga estava QUEBRADA: lia
   * `req.user.tipoPerfil`, campo que não existe em `AuthenticatedRequest` (o
   * papel vem do JWT em `app_metadata.papel`), então o valor era sempre
   * undefined e a rota respondia 401 para todo mundo, professor incluído.
   * Segundo, @Roles() entra na tabela ROUTE_ROLES, que tem guard-rail em CI —
   * uma permissão escrita à mão no handler escapa dessa conferência.
   */
  @Roles('professor_institucional', 'professor_independente', 'admin')
  @Get('analytics')
  async getAnalytics(@Req() req: AuthenticatedRequest): Promise<ClassAnalyticsResponse> {
    return this.classService.getAnalytics(req.user.sub);
  }

  /**
   * Nível 1 do painel: as turmas em que este professor leciona, com indicadores.
   *
   * Separada de `GET /turma` porque aquela é de DONO, de quem cria e administra.
   * Professor institucional não é dono de nada: ele precisa ver as turmas que
   * leciona sem poder criar nem renomear.
   */
  @Roles('professor_institucional', 'professor_independente', 'admin')
  @Get('turmas')
  async turmas(@Req() req: AuthenticatedRequest): Promise<IndicadorDeTurma[]> {
    return this.classService.turmasDoProfessor(req.user.sub);
  }
}
