import 'reflect-metadata';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Papel } from '@notaa/contracts';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ROUTE_ROLES, TODOS_OS_PAPEIS } from '../rbac';
import { enumerarRotas, type RotaEnumerada } from './enumerar-rotas';

// Matriz de 403: o RolesGuard de verdade, com o Reflector de verdade, rodando
// sobre cada rota registrada e cada papel. route-roles-sync.test.ts prova que a
// tabela ROUTE_ROLES bate com os decorators; aqui se prova que o guard barra
// quem a tabela não lista (e deixa passar quem ela lista).

const guard = new RolesGuard(new Reflector());
const PAPEIS: readonly Papel[] = TODOS_OS_PAPEIS;

function contexto(rota: RotaEnumerada, papel: Papel): ExecutionContext {
  return {
    getHandler: () => rota.handler,
    getClass: () => rota.controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { app_metadata: { papel } } }) }),
  } as unknown as ExecutionContext;
}

function entra(rota: RotaEnumerada, papel: Papel): boolean {
  try {
    return guard.canActivate(contexto(rota, papel));
  } catch (e) {
    if (e instanceof ForbiddenException) {
      expect(e.getResponse()).toMatchObject({ error: { code: 'FORBIDDEN_ROLE' } });
      return false;
    }
    throw e;
  }
}

const rotas = enumerarRotas();
const gestao = rotas.filter((r) => /^\w+ \/(academico|importacoes|instituicao|responsavel)\b/.test(r.chave));

describe('RolesGuard × ROUTE_ROLES, todas as rotas e todos os papéis', () => {
  it.each(rotas.map((r) => [r.chave, r] as const))('%s', (chave, rota) => {
    const publica = (ROUTE_ROLES[chave] ?? []).length === 0;
    for (const papel of PAPEIS) {
      const esperado = publica || (ROUTE_ROLES[chave] ?? []).includes(papel);
      expect(entra(rota, papel), `${chave} para ${papel}`).toBe(esperado);
    }
  });
});

describe('rotas da gestão acadêmica, da importação e do convite', () => {
  it('enumera as rotas esperadas (sanidade)', () => {
    const chaves = rotas.map((r) => r.chave);
    expect(chaves).toContain('POST /academico/regras');
    expect(chaves).toContain('POST /importacoes/:id/confirmar');
    expect(gestao.length).toBeGreaterThanOrEqual(24);
  });

  it('nenhuma delas fica aberta a "todos os papéis"', () => {
    for (const r of gestao) {
      expect(r.papeisEfetivos.length, r.chave).toBeGreaterThan(0);
      expect(r.papeisEfetivos.length, r.chave).toBeLessThan(TODOS_OS_PAPEIS.length);
    }
  });

  it.each(['estudante', 'professor_independente', 'responsavel', 'admin'] as const)(
    '%s recebe 403 em /academico e /importacoes',
    (papel) => {
      for (const r of rotas.filter((x) => /^\w+ \/(academico|importacoes)\b/.test(x.chave))) {
        expect(entra(r, papel), `${r.chave} para ${papel}`).toBe(false);
      }
    },
  );

  it('professor institucional só entra na leitura da regra vigente', () => {
    const liberadas = rotas
      .filter((r) => /^\w+ \/(academico|importacoes)\b/.test(r.chave))
      .filter((r) => entra(r, 'professor_institucional'))
      .map((r) => r.chave);
    expect(liberadas).toEqual(['GET /academico/regras/ativa']);
  });

  it('admin de instituição entra em todas as rotas de /academico e /importacoes', () => {
    for (const r of rotas.filter((x) => /^\w+ \/(academico|importacoes)\b/.test(x.chave))) {
      expect(entra(r, 'admin_instituicao'), r.chave).toBe(true);
    }
  });

  it('convite do responsável: a instituição emite, só o responsável aceita', () => {
    const emitir = rotas.find((r) => r.chave === 'POST /instituicao/responsaveis/:responsavelAlunoId/convites')!;
    const aceitar = rotas.find((r) => r.chave === 'POST /responsavel/convites/aceitar')!;
    expect(PAPEIS.filter((p) => entra(emitir, p))).toEqual(['admin_instituicao']);
    expect(PAPEIS.filter((p) => entra(aceitar, p))).toEqual(['responsavel']);
  });

  it('sem papel no token, 403', () => {
    const r = rotas.find((x) => x.chave === 'POST /academico/regras')!;
    const ctx = {
      getHandler: () => r.handler,
      getClass: () => r.controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { app_metadata: {} } }) }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
