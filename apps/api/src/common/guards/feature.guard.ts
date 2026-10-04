import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { isFeatureEnabled, type Feature } from '../feature-flags';

/**
 * Primeiro guard global — roda ANTES do AuthGuard (ordem de registro em
 * app.module.ts) e, por ser guard, antes também dos pipes de validação.
 *
 * A ordem importa: se a checagem ficasse no handler, uma requisição com corpo
 * inválido para uma rota oculta receberia o 400 do ZodValidationPipe, revelando
 * o contrato de uma funcionalidade que não está no ar. Aqui a resposta é sempre
 * a mesma 404, com ou sem token, com corpo válido ou não.
 *
 * Responde 404 e não 403 de propósito: "oculta" quer dizer que, para quem
 * chama, a rota não existe.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<Feature | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Rota sem @RequiresFeature() não é afetada — o guard é no-op para o resto da API.
    if (!feature || isFeatureEnabled(feature)) return true;

    throw new NotFoundException({
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
  }
}
