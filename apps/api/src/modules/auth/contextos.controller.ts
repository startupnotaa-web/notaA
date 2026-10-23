import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  CABECALHO_CONTEXTO,
  TrocarContextoRequestSchema,
  lerContexto,
  type ContextosResponse,
  type TrocarContextoRequest,
} from '@notaa/contracts';
import { SemValidarContexto } from '../../common/decorators/sem-validar-contexto.decorator';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ContextosService } from './contextos.service';

// Papéis: todos os autenticados (ver ROUTE_ROLES). A lista e a troca valem para a própria conta.
@Controller('me')
export class ContextosController {
  constructor(private readonly contextos: ContextosService) {}

  /** Contextos que esta conta tem de verdade, calculados dos vínculos. O primeiro é o padrão. */
  @SemValidarContexto()
  @Get('contextos')
  async listar(@Req() request: AuthenticatedRequest): Promise<ContextosResponse> {
    const { sub, app_metadata } = request.user;
    return { contextos: await this.contextos.listar(sub, app_metadata.papel) };
  }

  /**
   * Confirma a escolha e registra na auditoria (só ids). O contexto de origem vem do cabeçalho e só
   * entra no registro se ainda for válido; um cabeçalho velho ou forjado vira `de: null`.
   */
  @SemValidarContexto()
  @Post('contexto')
  @HttpCode(204)
  async trocar(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(TrocarContextoRequestSchema)) para: TrocarContextoRequest,
  ): Promise<void> {
    const { sub, app_metadata } = request.user;
    const papel = app_metadata.papel;

    if (!(await this.contextos.existe(sub, papel, para))) {
      throw new ForbiddenException({
        error: {
          code: 'CONTEXTO_INVALIDO',
          message: 'Esse acesso não está disponível para a sua conta. Escolha outro em "Entrar como".',
        },
      });
    }

    const bruto = request.headers[CABECALHO_CONTEXTO];
    const anterior = lerContexto(Array.isArray(bruto) ? undefined : bruto);
    const de = anterior && (await this.contextos.existe(sub, papel, anterior)) ? anterior : null;

    await this.contextos.registrarTroca(sub, papel, de, para);
  }
}
