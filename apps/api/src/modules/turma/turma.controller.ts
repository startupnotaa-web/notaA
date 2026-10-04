import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  AtualizarTurmaRequestSchema,
  CriarTurmaRequestSchema,
  DecidirSolicitacoesRequestSchema,
  VincularProfessorRequestSchema,
  type AtualizarTurmaRequest,
  type CodigoConvite,
  type CriarTurmaRequest,
  type DecidirSolicitacoesRequest,
  type AlunoDaTurma,
  type DecidirSolicitacoesResponse,
  type DetalheDoAluno,
  type ProfessorDaTurma,
  type SolicitacaoPendente,
  type Turma,
  type VincularProfessorRequest,
} from '@notaa/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TurmaService } from './turma.service';

/**
 * Turma, lado de quem administra.
 *
 * Os papéis aqui são amplos de propósito: @Roles() só barra quem nunca poderia
 * entrar. O que cada um pode fazer com QUAL turma é decidido no serviço, pelo
 * EscopoService — professor institucional não cria turma, e ninguém toca em turma
 * de outro dono.
 */
@Controller('turma')
export class TurmaController {
  constructor(private readonly turma: TurmaService) {}

  @Roles('admin_instituicao', 'professor_independente')
  @Get()
  listar(@Req() req: AuthenticatedRequest): Promise<Turma[]> {
    return this.turma.listar(req.user.sub, req.user.app_metadata.papel);
  }

  @Roles('admin_instituicao', 'professor_independente')
  @Post()
  criar(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarTurmaRequestSchema)) body: CriarTurmaRequest,
  ): Promise<Turma> {
    return this.turma.criar(req.user.sub, req.user.app_metadata.papel, body);
  }

  @Roles('admin_instituicao', 'professor_independente')
  @Patch(':id')
  atualizar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AtualizarTurmaRequestSchema)) body: AtualizarTurmaRequest,
  ): Promise<Turma> {
    return this.turma.atualizar(req.user.sub, req.user.app_metadata.papel, id, body);
  }

  /** Gera um código novo e invalida o anterior. Não afeta quem já está na turma. */
  @Roles('admin_instituicao', 'professor_independente')
  @Post(':id/codigo')
  regenerarCodigo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CodigoConvite> {
    return this.turma.regenerarCodigo(req.user.sub, req.user.app_metadata.papel, id);
  }

  @Roles('admin_instituicao', 'professor_independente')
  @Get(':id/professores')
  listarProfessores(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProfessorDaTurma[]> {
    return this.turma.listarProfessores(req.user.sub, req.user.app_metadata.papel, id);
  }

  @Roles('admin_instituicao')
  @Post(':id/professores')
  vincularProfessor(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(VincularProfessorRequestSchema)) body: VincularProfessorRequest,
  ): Promise<ProfessorDaTurma[]> {
    return this.turma.vincularProfessor(
      req.user.sub,
      req.user.app_metadata.papel,
      id,
      body.professorId,
    );
  }

  @Roles('admin_instituicao')
  @Delete(':id/professores/:professorId')
  desvincularProfessor(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
  ): Promise<ProfessorDaTurma[]> {
    return this.turma.desvincularProfessor(
      req.user.sub,
      req.user.app_metadata.papel,
      id,
      professorId,
    );
  }

  // ─── Solicitações de entrada ──────────────────────────────────────────────

  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Get(':id/solicitacoes')
  listarSolicitacoes(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SolicitacaoPendente[]> {
    return this.turma.listarSolicitacoes(req.user.sub, req.user.app_metadata.papel, id);
  }

  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Post(':id/solicitacoes/aprovar')
  aprovar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(DecidirSolicitacoesRequestSchema)) body: DecidirSolicitacoesRequest,
  ): Promise<DecidirSolicitacoesResponse> {
    return this.turma.aprovar(req.user.sub, req.user.app_metadata.papel, id, body.estudanteIds);
  }

  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Post(':id/solicitacoes/recusar')
  recusar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(DecidirSolicitacoesRequestSchema)) body: DecidirSolicitacoesRequest,
  ): Promise<DecidirSolicitacoesResponse> {
    return this.turma.recusar(req.user.sub, req.user.app_metadata.papel, id, body.estudanteIds);
  }

  // ─── Alunos da turma ──────────────────────────────────────────────────────

  /**
   * Alunos DESTA turma. Existe porque a análise de turma do painel do professor
   * agrega todas as turmas dele de uma vez, e a visão de uma turma precisa da
   * lista daquela turma.
   */
  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Get(':id/alunos')
  alunos(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlunoDaTurma[]> {
    return this.turma.alunosDaTurma(req.user.sub, req.user.app_metadata.papel, id);
  }

  /**
   * Nível 3 do painel: o aluno por dentro. Desempenho por área, temas em que
   * erra, evolução semanal e as redações com nota por competência e texto.
   */
  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Get(':id/alunos/:estudanteId')
  detalheDoAluno(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('estudanteId', ParseUUIDPipe) estudanteId: string,
  ): Promise<DetalheDoAluno> {
    return this.turma.detalheDoAluno(req.user.sub, req.user.app_metadata.papel, id, estudanteId);
  }

  /** Remove o vínculo do aluno com a turma. A conta dele continua sendo dele. */
  @Roles('admin_instituicao', 'professor_institucional', 'professor_independente')
  @Delete(':id/alunos/:estudanteId')
  removerAluno(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('estudanteId', ParseUUIDPipe) estudanteId: string,
  ): Promise<DecidirSolicitacoesResponse> {
    return this.turma.removerAluno(req.user.sub, req.user.app_metadata.papel, id, estudanteId);
  }
}
