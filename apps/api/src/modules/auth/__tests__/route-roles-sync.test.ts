import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { RequestMethod } from '@nestjs/common';
import type { Papel } from '@notaa/contracts';
import { AppModule } from '../../../app.module';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { PUBLICO, ROUTE_ROLES, TODOS_OS_PAPEIS } from '../rbac';

// Guard-rail de RBAC em CI (auditoria R5, fase 3 item 20): enumera TODAS as
// rotas registradas nos controllers do AppModule (via reflection, sem subir a
// aplicação nem tocar no banco) e falha se alguma não estiver em ROUTE_ROLES
// ou se a tabela divergir do que os decorators @Public()/@Roles() aplicam em
// runtime. Rota nova sem entrada na tabela = build vermelho (default-deny).

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

interface RotaEnumerada {
  chave: string; // ex.: 'GET /me/dashboard'
  papeisEfetivos: readonly Papel[]; // o que os decorators aplicam em runtime
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

function enumerarRotas(): RotaEnumerada[] {
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
      });
    }
  }
  return rotas;
}

describe('ROUTE_ROLES ↔ controllers (guard-rail de CI)', () => {
  const rotas = enumerarRotas();

  it('enumera as rotas do AppModule (sanidade da reflection)', () => {
    expect(rotas.length).toBeGreaterThan(10);
    expect(rotas.map((r) => r.chave)).toContain('GET /me');
  });

  it('toda rota registrada tem entrada em ROUTE_ROLES', () => {
    const faltando = rotas.map((r) => r.chave).filter((chave) => !(chave in ROUTE_ROLES));
    expect(faltando, `Rotas sem entrada em ROUTE_ROLES:\n${faltando.join('\n')}`).toEqual([]);
  });

  it('ROUTE_ROLES bate com o que @Public()/@Roles() aplicam em runtime', () => {
    const divergentes = rotas
      .filter((r) => r.chave in ROUTE_ROLES)
      .filter((r) => {
        const tabela = [...(ROUTE_ROLES[r.chave] ?? [])].sort();
        const efetivo = [...r.papeisEfetivos].sort();
        return JSON.stringify(tabela) !== JSON.stringify(efetivo);
      })
      .map(
        (r) =>
          `${r.chave}: tabela=[${(ROUTE_ROLES[r.chave] ?? []).join(',')}] runtime=[${r.papeisEfetivos.join(',')}]`,
      );
    expect(divergentes, `Divergências tabela × decorators:\n${divergentes.join('\n')}`).toEqual([]);
  });

  it('ROUTE_ROLES não tem entradas obsoletas (rota removida do código)', () => {
    const chavesReais = new Set(rotas.map((r) => r.chave));
    const obsoletas = Object.keys(ROUTE_ROLES).filter((chave) => !chavesReais.has(chave));
    expect(obsoletas, `Entradas de ROUTE_ROLES sem rota correspondente:\n${obsoletas.join('\n')}`).toEqual(
      [],
    );
  });
});
