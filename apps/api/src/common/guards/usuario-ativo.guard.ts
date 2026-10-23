import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USUARIO_STATUS } from '../../modules/auth/auth.tokens';
import type { UsuarioStatusPort } from '../../modules/auth/usuario-status';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from './auth.guard';

/** Quanto tempo o status de um usuário fica em memória. É o atraso máximo para uma suspensão valer. */
export const TTL_STATUS_MS = 30_000;
const LIMITE_DO_CACHE = 5_000;

/**
 * Terceiro guard global (depois do AuthGuard, antes do RolesGuard): só usuário com
 * `usuario.status = 'ativo'` usa a API. Suspenso e pendente recebem 403 `CONTA_INATIVA`, mesmo com
 * um token ainda válido — o JWT dura uma hora e não sabe da suspensão. O RLS já barra suspenso e
 * pendente nas funções de leitura (migração 0016); isto fecha a porta da API também.
 *
 * Cache em memória de 30 s por usuário, para não pagar uma consulta por requisição. O custo é que
 * uma suspensão leva até 30 s para valer por instância. Conta sem linha em `usuario` passa daqui:
 * quem decide o que fazer com ela é a rota (o JWT só chega até este ponto com papel gravado, e o
 * papel é gravado depois da linha).
 */
@Injectable()
export class UsuarioAtivoGuard implements CanActivate {
  private readonly cache = new Map<string, { ativo: boolean; ate: number }>();

  constructor(
    private readonly reflector: Reflector,
    @Inject(USUARIO_STATUS) private readonly status: UsuarioStatusPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publica) return true;

    const sub = context.switchToHttp().getRequest<AuthenticatedRequest>().user?.sub;
    if (!sub) return true; // sem token a recusa é do AuthGuard

    if (!(await this.estaAtivo(sub))) {
      throw new ForbiddenException({
        error: {
          code: 'CONTA_INATIVA',
          message: 'Sua conta está suspensa ou ainda não foi ativada. Fale com a sua instituição ou com o suporte do Nota A.',
        },
      });
    }
    return true;
  }

  private async estaAtivo(usuarioId: string): Promise<boolean> {
    const agora = Date.now();
    const guardado = this.cache.get(usuarioId);
    if (guardado && guardado.ate > agora) return guardado.ativo;

    const status = await this.status.statusDe(usuarioId);
    const ativo = status === null || status === 'ativo';

    if (this.cache.size >= LIMITE_DO_CACHE) this.cache.clear();
    this.cache.set(usuarioId, { ativo, ate: agora + TTL_STATUS_MS });
    return ativo;
  }
}
