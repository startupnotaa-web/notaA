import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import type { Papel } from '@notaa/contracts';
import { AppModule } from '../../../app.module';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { PUBLICO, TODOS_OS_PAPEIS } from '../rbac';

// Enumera as rotas registradas nos controllers do AppModule por reflexão, sem
// subir a aplicação nem tocar no banco. Usado pelos guard-rails de RBAC.

const VERBO: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
  [RequestMethod.ALL]: 'ALL',
};

export interface RotaEnumerada {
  chave: string; // ex.: 'GET /me/dashboard'
  papeisEfetivos: readonly Papel[]; // o que os decorators aplicam em runtime
  controller: new (...args: never[]) => unknown;
  handler: (...args: never[]) => unknown;
}

function normalizarPath(...segmentos: (string | undefined)[]): string {
  const junto = segmentos
    .filter((s): s is string => s != null)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  return junto.startsWith('/') ? junto : `/${junto}`;
}

/** Percorre a árvore de módulos e coleta as classes de controller. */
function coletarControllers(modulo: unknown, vistos = new Set<unknown>()): unknown[] {
  if (!modulo || vistos.has(modulo)) return [];
  vistos.add(modulo);
  const controllers: unknown[] = Reflect.getMetadata('controllers', modulo as object) ?? [];
  const imports: unknown[] = Reflect.getMetadata('imports', modulo as object) ?? [];
  for (const imp of imports) {
    // Módulos dinâmicos ({ module: X, ... }) e classes estáticas.
    const alvo = (imp as { module?: unknown })?.module ?? imp;
    controllers.push(...coletarControllers(alvo, vistos));
  }
  return controllers;
}

export function enumerarRotas(): RotaEnumerada[] {
  const rotas: RotaEnumerada[] = [];
  for (const controller of coletarControllers(AppModule)) {
    const ctrl = controller as { prototype: Record<string, unknown> };
    const prefixo: string = Reflect.getMetadata('path', controller as object) ?? '/';
    const publicClasse: boolean = Reflect.getMetadata(IS_PUBLIC_KEY, controller as object) ?? false;
    const rolesClasse: Papel[] | undefined = Reflect.getMetadata(ROLES_KEY, controller as object);

    for (const nome of Object.getOwnPropertyNames(ctrl.prototype)) {
      if (nome === 'constructor') continue;
      const handler = ctrl.prototype[nome];
      if (typeof handler !== 'function') continue;
      const metodo: number | undefined = Reflect.getMetadata('method', handler);
      const path: string | undefined = Reflect.getMetadata('path', handler);
      if (metodo === undefined || path === undefined) continue;

      const publicHandler: boolean = Reflect.getMetadata(IS_PUBLIC_KEY, handler) ?? publicClasse;
      const rolesHandler: Papel[] | undefined = Reflect.getMetadata(ROLES_KEY, handler) ?? rolesClasse;
      const papeisEfetivos = publicHandler ? PUBLICO : (rolesHandler ?? TODOS_OS_PAPEIS);

      rotas.push({
        chave: `${VERBO[metodo] ?? metodo} ${normalizarPath(prefixo, path)}`,
        papeisEfetivos,
        controller: controller as RotaEnumerada['controller'],
        handler: handler as RotaEnumerada['handler'],
      });
    }
  }
  return rotas;
}

