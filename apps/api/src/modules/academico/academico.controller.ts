import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  AnoLetivoQuerySchema,
  AtribuirDisciplinaRequestSchema,
  AtualizarDisciplinaRequestSchema,
  AtualizarPeriodoAvaliativoRequestSchema,
  CriarDisciplinaRequestSchema,
  CriarPeriodoAvaliativoRequestSchema,
  CriarRegraAvaliativaRequestSchema,
  SimularRegraRequestSchema,
  type AnoLetivoQuery,
  type AtribuirDisciplinaRequest,
  type AtualizarDisciplinaRequest,
  type AtualizarPeriodoAvaliativoRequest,
  type CriarDisciplinaRequest,
  type CriarPeriodoAvaliativoRequest,
  type CriarRegraAvaliativaRequest,
  type Disciplina,
  type PeriodoAvaliativo,
  type RegraAvaliativaVersao,
  type SimularRegraRequest,
  type SimularRegraResponse,
  type TurmaDisciplina,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AcademicoService } from './academico.service';

/**
 * Configuração acadêmica da instituição. Só admin de instituição (gestor ou
 * coordenação) configura; a regra ativa também é lida pelo professor
 * institucional. A instituição vem sempre do banco, pelo usuário do token.
 */
@Controller('academico')
@Roles('admin_instituicao')
export class AcademicoController {
  constructor(private readonly academico: AcademicoService) {}

  // ─── Períodos ──────────────────────────────────────────────────────────────

  @Get('periodos')
  listarPeriodos(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(AnoLetivoQuerySchema)) q: AnoLetivoQuery,
  ): Promise<PeriodoAvaliativo[]> {
    return this.academico.listarPeriodos(req.user.sub, q.anoLetivoId);
  }

  @Post('periodos')
  criarPeriodo(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarPeriodoAvaliativoRequestSchema)) body: CriarPeriodoAvaliativoRequest,
  ): Promise<PeriodoAvaliativo> {
    return this.academico.criarPeriodo(req.user.sub, body);
  }

  @Patch('periodos/:id')
  atualizarPeriodo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AtualizarPeriodoAvaliativoRequestSchema))
    body: AtualizarPeriodoAvaliativoRequest,
  ): Promise<PeriodoAvaliativo> {
    return this.academico.atualizarPeriodo(req.user.sub, id, body);
  }

  @Delete('periodos/:id')
  @HttpCode(204)
  removerPeriodo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.academico.removerPeriodo(req.user.sub, id);
  }

  // ─── Disciplinas ───────────────────────────────────────────────────────────

  @Get('disciplinas')
  listarDisciplinas(@Req() req: AuthenticatedRequest): Promise<Disciplina[]> {
    return this.academico.listarDisciplinas(req.user.sub);
  }

  @Post('disciplinas')
  criarDisciplina(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarDisciplinaRequestSchema)) body: CriarDisciplinaRequest,
  ): Promise<Disciplina> {
    return this.academico.criarDisciplina(req.user.sub, body);
  }

  @Patch('disciplinas/:id')
  atualizarDisciplina(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AtualizarDisciplinaRequestSchema)) body: AtualizarDisciplinaRequest,
  ): Promise<Disciplina> {
    return this.academico.atualizarDisciplina(req.user.sub, id, body);
  }

  // ─── Turma × disciplina × professor ───────────────────────────────────────

  @Get('turmas/:turmaId/disciplinas')
  listarDisciplinasDaTurma(
    @Req() req: AuthenticatedRequest,
    @Param('turmaId', ParseUUIDPipe) turmaId: string,
  ): Promise<TurmaDisciplina[]> {
    return this.academico.listarDisciplinasDaTurma(req.user.sub, turmaId);
  }

  @Put('turmas/:turmaId/disciplinas/:disciplinaId')
  atribuirDisciplina(
    @Req() req: AuthenticatedRequest,
    @Param('turmaId', ParseUUIDPipe) turmaId: string,
    @Param('disciplinaId', ParseUUIDPipe) disciplinaId: string,
    @Body(new ZodValidationPipe(AtribuirDisciplinaRequestSchema)) body: AtribuirDisciplinaRequest,
  ): Promise<TurmaDisciplina[]> {
    return this.academico.atribuirDisciplina(req.user.sub, turmaId, disciplinaId, body);
  }

  @Delete('turmas/:turmaId/disciplinas/:disciplinaId')
  @HttpCode(204)
  removerDisciplinaDaTurma(
    @Req() req: AuthenticatedRequest,
    @Param('turmaId', ParseUUIDPipe) turmaId: string,
    @Param('disciplinaId', ParseUUIDPipe) disciplinaId: string,
  ): Promise<void> {
    return this.academico.removerDisciplinaDaTurma(req.user.sub, turmaId, disciplinaId);
  }

  // ─── Regra avaliativa ─────────────────────────────────────────────────────

  @Get('regras')
  listarRegras(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(AnoLetivoQuerySchema)) q: AnoLetivoQuery,
  ): Promise<RegraAvaliativaVersao[]> {
    return this.academico.listarRegras(req.user.sub, q.anoLetivoId);
  }

  @Get('regras/ativa')
  @Roles('admin_instituicao', 'professor_institucional')
  regraAtiva(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(AnoLetivoQuerySchema)) q: AnoLetivoQuery,
  ): Promise<RegraAvaliativaVersao | null> {
    return this.academico.regraAtiva(req.user.sub, q.anoLetivoId);
  }

  @Post('regras')
  criarRegra(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarRegraAvaliativaRequestSchema)) body: CriarRegraAvaliativaRequest,
  ): Promise<RegraAvaliativaVersao> {
    return this.academico.criarRegra(req.user.sub, req.user.app_metadata.papel, body);
  }

  /** Simulação: recebe regra e notas de exemplo, devolve médias e situação. Não grava nada. */
  @Post('regras/simular')
  @HttpCode(200)
  simular(
    @Body(new ZodValidationPipe(SimularRegraRequestSchema)) body: SimularRegraRequest,
  ): SimularRegraResponse {
    return this.academico.simular(body);
  }

  @Post('regras/:id/ativar')
  @HttpCode(200)
  ativarRegra(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RegraAvaliativaVersao> {
    return this.academico.ativarRegra(req.user.sub, req.user.app_metadata.papel, id);
  }
}
