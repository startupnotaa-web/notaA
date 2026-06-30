import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { verifySupabaseJwt } from '../../modules/auth/verify-jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MOCK_DEV_USER_ID, isDevBypassEnabled } from '../dev-user';
import type { JwtClaims } from '@notaa/contracts';

export type AuthenticatedRequest = FastifyRequest & { user: JwtClaims };

/**
 * Guard global (doc 03 §4 camada de Orquestração — "AuthGuard + RoleGuard").
 * Único lugar que aceita um Bearer token: extrai, verifica via
 * verifySupabaseJwt (passo 5) e anexa os claims em `request.user`. Rotas
 * marcadas @Public() pulam a verificação.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Bypass de Dev Mode para facilitar testes locais sem login. O `sub` precisa
    // ser um UUID válido (MOCK_DEV_USER_ID): o adaptador de persistência usa esse
    // mesmo id como chave em colunas `uuid` — um id não-UUID quebra todo o save.
    if (isDevBypassEnabled() && request.headers['x-development-mode'] === 'true') {
      (request as AuthenticatedRequest).user = {
        sub: MOCK_DEV_USER_ID,
        app_metadata: { papel: 'estudante' },
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token de autenticação ausente.' },
      });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      // Falha de configuração do ambiente, não do cliente — não confundir com 401 de negócio.
      throw new Error('SUPABASE_JWT_SECRET não configurado no ambiente da API.');
    }

    try {
      const token = authHeader.slice('Bearer '.length);
      (request as AuthenticatedRequest).user = await verifySupabaseJwt(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token inválido ou expirado.' },
      });
    }
  }
}
