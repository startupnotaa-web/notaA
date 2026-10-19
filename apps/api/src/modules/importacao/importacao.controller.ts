import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  CriarImportacaoRequestSchema,
  PreviaQuerySchema,
  SalvarMapeamentoRequestSchema,
  TipoExportacaoSchema,
  TipoImportacaoSchema,
  type ArquivoRecebidoResponse,
  type CriarImportacaoRequest,
  type CriarImportacaoResponse,
  type Importacao,
  type PreviaQuery,
  type PreviaResponse,
  type SalvarMapeamentoRequest,
  type TipoExportacao,
  type TipoImportacao,
} from '@notaa/contracts';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ImportacaoService } from './importacao.service';

function anexoCsv(reply: FastifyReply, nome: string): void {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="${nome}"`);
  // Dado pessoal: nada de cache em proxy nem no navegador.
  reply.header('Cache-Control', 'no-store');
}

/**
 * Importação e exportação de planilhas da instituição. Só admin de
 * instituição; exportar é só da gestão (checado no serviço, porque a função
 * gestor/coordenação não está no JWT).
 */
@Controller('importacoes')
@Roles('admin_instituicao')
export class ImportacaoController {
  constructor(private readonly importacoes: ImportacaoService) {}

  @Get()
  listar(@Req() req: AuthenticatedRequest): Promise<Importacao[]> {
    return this.importacoes.listar(req.user.sub);
  }

  @Post()
  criar(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CriarImportacaoRequestSchema)) body: CriarImportacaoRequest,
  ): Promise<CriarImportacaoResponse> {
    return this.importacoes.criar(req.user.sub, body);
  }

  @Get('modelos/:tipo')
  modelo(
    @Param('tipo', new ZodValidationPipe(TipoImportacaoSchema)) tipo: TipoImportacao,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): string {
    anexoCsv(reply, `modelo-${tipo}.csv`);
    return this.importacoes.modelo(tipo);
  }

  @Get('exportar/:tipo')
  async exportar(
    @Req() req: AuthenticatedRequest,
    @Param('tipo', new ZodValidationPipe(TipoExportacaoSchema)) tipo: TipoExportacao,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<string> {
    const csv = await this.importacoes.exportar(req.user.sub, req.user.app_metadata.papel, tipo);
    anexoCsv(reply, `${tipo}-${new Date().toISOString().slice(0, 10)}.csv`);
    return csv;
  }

  @Get(':id')
  obter(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<Importacao> {
    return this.importacoes.obter(req.user.sub, id);
  }

  @Post(':id/arquivo-enviado')
  @HttpCode(200)
  arquivoEnviado(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArquivoRecebidoResponse> {
    return this.importacoes.arquivoEnviado(req.user.sub, id);
  }

  @Put(':id/mapeamento')
  salvarMapeamento(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(SalvarMapeamentoRequestSchema)) body: SalvarMapeamentoRequest,
  ): Promise<Importacao> {
    return this.importacoes.salvarMapeamento(req.user.sub, id, body.mapeamento);
  }

  @Get(':id/previa')
  previa(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(PreviaQuerySchema)) query: PreviaQuery,
  ): Promise<PreviaResponse> {
    return this.importacoes.previa(req.user.sub, id, query);
  }

  /** Enfileira para o worker. 202: a gravação acontece depois; acompanhe por GET /importacoes/:id. */
  @Post(':id/confirmar')
  @HttpCode(202)
  confirmar(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<Importacao> {
    return this.importacoes.confirmar(req.user.sub, req.user.app_metadata.papel, id);
  }
}
