import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type {
  AlunoDaInstituicao,
  IndicadorDeTurma,
  InstituicaoOverview,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { InstituicaoService } from './instituicao.service';

/**
 * Painel administrativo da instituição (perfis.md).
 *
 * Administrativo quer dizer: rendimento, histórico e engajamento dos alunos
 * vinculados. Nada de batalha, ranking entre instituições ou competição — e
 * nenhum indicador por professor, que perfis.md proíbe comparar.
 */
@Controller('instituicao')
export class InstituicaoController {
  constructor(private readonly instituicao: InstituicaoService) {}

  @Roles('admin_instituicao')
  @Get('overview')
  overview(@Req() req: AuthenticatedRequest): Promise<InstituicaoOverview> {
    return this.instituicao.overview(req.user.sub);
  }

  /** Alunos de todas as turmas, com busca por nome e filtro por turma. */
  @Roles('admin_instituicao')
  @Get('alunos')
  alunos(
    @Req() req: AuthenticatedRequest,
    @Query('turmaId') turmaId?: string,
    @Query('busca') busca?: string,
  ): Promise<AlunoDaInstituicao[]> {
    return this.instituicao.alunos(req.user.sub, { turmaId, busca });
  }

  /**
   * Detalhe de uma turma. Aberto também ao professor, que acessa apenas as
   * turmas em que leciona — a distinção é feita no serviço, pelo escopo.
   */
  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Get('turmas/:id/desempenho')
  desempenhoDaTurma(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IndicadorDeTurma> {
    return this.instituicao.desempenhoDaTurma(
      req.user.sub,
      id,
      req.user.app_metadata.papel === 'admin_instituicao',
    );
  }
}
