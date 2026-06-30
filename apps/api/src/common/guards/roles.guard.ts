import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Papel } from '@notaa/contracts';
import { hasRole } from '../../modules/auth/rbac';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from './auth.guard';

/**
 * Segundo guard global — roda DEPOIS do AuthGuard (ordem de registro em
 * app.module.ts). Usa o núcleo puro hasRole() do passo 5; esta classe só
 * traduz isso para o pipeline HTTP do Nest (doc 03 §9: Guards não conhecem
 * regra de negócio, só decidem "este papel entra nesta rota?").
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Papel[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Sem @Roles() em rota autenticada = qualquer papel autenticado pode entrar ("todos", doc 05 §2).
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const papel = request.user?.app_metadata?.papel;
    if (!papel || !hasRole(papel, required)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN_ROLE', message: 'Seu papel não tem acesso a este recurso.' },
      });
    }
    return true;
  }
}
