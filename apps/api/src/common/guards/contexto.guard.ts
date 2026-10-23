import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CABECALHO_CONTEXTO, lerContexto } from '@notaa/contracts';
import { ContextosService } from '../../modules/auth/contextos.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SEM_VALIDAR_CONTEXTO_KEY } from '../decorators/sem-validar-contexto.decorator';
import type { AuthenticatedRequest } from './auth.guard';

function contextoInvalido(): never {
  throw new ForbiddenException({
    error: {
      code: 'CONTEXTO_INVALIDO',
      message: 'Esse acesso não está mais disponível para a sua conta. Escolha outro em "Entrar como".',
    },
  });
}

/**
 * Último guard global. Se a requisição traz `x-contexto`, o servidor confere AGORA, contra os
 * vínculos reais, se aquele contexto é desta conta e do papel que está no token. Nada vindo do
 * cliente é aceito por já ter sido aceito antes: a cada requisição a consulta se repete.
 *
 * Sem o cabeçalho, vale o contexto padrão (a conta só tem um, ou ainda não escolheu). O contexto
 * validado fica em `request.contexto` para as rotas que o usarem; ele nunca amplia permissão.
 */
@Injectable()
export class ContextoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly contextos: ContextosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const alvos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, alvos)) return true;
    if (this.reflector.getAllAndOverride<boolean>(SEM_VALIDAR_CONTEXTO_KEY, alvos)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bruto = request.headers?.[CABECALHO_CONTEXTO];
    if (bruto === undefined) return true;

    const valor = Array.isArray(bruto) ? undefined : bruto; // cabeçalho repetido não vale
    const pedido = lerContexto(valor);
    const usuario = request.user;
    if (!pedido || !usuario) return contextoInvalido();

    if (!(await this.contextos.existe(usuario.sub, usuario.app_metadata.papel, pedido))) {
      return contextoInvalido();
    }
    request.contexto = pedido;
    return true;
  }
}
