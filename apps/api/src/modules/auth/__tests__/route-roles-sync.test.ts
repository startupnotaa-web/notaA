import { describe, expect, it } from 'vitest';
import { ROUTE_ROLES } from '../rbac';
import { enumerarRotas } from './enumerar-rotas';

// Guard-rail de RBAC em CI (auditoria R5, fase 3 item 20): enumera TODAS as
// rotas registradas nos controllers do AppModule (via reflection, sem subir a
// aplicação nem tocar no banco) e falha se alguma não estiver em ROUTE_ROLES
// ou se a tabela divergir do que os decorators @Public()/@Roles() aplicam em
// runtime. Rota nova sem entrada na tabela = build vermelho (default-deny).

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
