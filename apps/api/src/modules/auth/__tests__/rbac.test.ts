import { describe, expect, it } from 'vitest';
import { ROUTE_ROLES, hasRole, isRouteAllowed } from '../rbac';

describe('hasRole', () => {
  it('permite quando o papel está na lista', () => {
    expect(hasRole('admin_instituicao', ['admin_instituicao', 'professor_institucional'])).toBe(true);
  });

  it('nega quando o papel não está na lista', () => {
    expect(hasRole('estudante', ['admin_instituicao', 'professor_institucional'])).toBe(false);
  });
});

describe('isRouteAllowed (doc 05 §2/§8 — rotas já fixadas)', () => {
  it('rota pública permite qualquer papel', () => {
    expect(isRouteAllowed('POST /auth/register', 'estudante')).toBe(true);
  });

  it('"/me" permite todos os papéis', () => {
    const papeis = [
      'estudante',
      'professor_institucional',
      'professor_independente',
      'admin_instituicao',
      'responsavel',
      'admin',
    ] as const;
    for (const papel of papeis) {
      expect(isRouteAllowed('GET /me', papel)).toBe(true);
    }
  });

  it('"/instituicao/overview" só permite admin de instituição', () => {
    expect(isRouteAllowed('GET /instituicao/overview', 'admin_instituicao')).toBe(true);
    expect(isRouteAllowed('GET /instituicao/overview', 'professor_institucional')).toBe(false);
    expect(isRouteAllowed('GET /instituicao/overview', 'estudante')).toBe(false);
  });

  it('"/admin/users" só permite admin', () => {
    expect(isRouteAllowed('GET /admin/users', 'admin')).toBe(true);
    expect(isRouteAllowed('GET /admin/users', 'admin_instituicao')).toBe(false);
  });

  it('default-deny: lança erro para rota não registrada em ROUTE_ROLES', () => {
    expect(() => isRouteAllowed('GET /rota-inexistente', 'admin')).toThrow();
  });

  it('todas as entradas de ROUTE_ROLES usam papéis válidos', () => {
    const validos = new Set([
      'estudante',
      'professor_institucional',
      'professor_independente',
      'admin_instituicao',
      'responsavel',
      'admin',
    ]);
    for (const papeis of Object.values(ROUTE_ROLES)) {
      for (const papel of papeis) {
        expect(validos.has(papel)).toBe(true);
      }
    }
  });
});
