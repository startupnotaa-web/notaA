import { describe, expect, it } from 'vitest';
import { ROUTE_ROLES, hasRole, isRouteAllowed } from '../rbac';

describe('hasRole', () => {
  it('permite quando o papel está na lista', () => {
    expect(hasRole('gestor', ['gestor', 'professor'])).toBe(true);
  });

  it('nega quando o papel não está na lista', () => {
    expect(hasRole('estudante', ['gestor', 'professor'])).toBe(false);
  });
});

describe('isRouteAllowed (doc 05 §2/§8 — rotas já fixadas)', () => {
  it('rota pública permite qualquer papel', () => {
    expect(isRouteAllowed('POST /auth/register', 'estudante')).toBe(true);
  });

  it('"/me" permite todos os papéis', () => {
    const papeis = ['estudante', 'professor', 'gestor', 'responsavel', 'admin'] as const;
    for (const papel of papeis) {
      expect(isRouteAllowed('GET /me', papel)).toBe(true);
    }
  });

  it('"/escola/overview" só permite gestor', () => {
    expect(isRouteAllowed('GET /escola/overview', 'gestor')).toBe(true);
    expect(isRouteAllowed('GET /escola/overview', 'professor')).toBe(false);
    expect(isRouteAllowed('GET /escola/overview', 'estudante')).toBe(false);
  });

  it('"/admin/users" só permite admin', () => {
    expect(isRouteAllowed('GET /admin/users', 'admin')).toBe(true);
    expect(isRouteAllowed('GET /admin/users', 'gestor')).toBe(false);
  });

  it('default-deny: lança erro para rota não registrada em ROUTE_ROLES', () => {
    expect(() => isRouteAllowed('GET /rota-inexistente', 'admin')).toThrow();
  });

  it('todas as entradas de ROUTE_ROLES usam papéis válidos', () => {
    const validos = new Set(['estudante', 'professor', 'gestor', 'responsavel', 'admin']);
    for (const papeis of Object.values(ROUTE_ROLES)) {
      for (const papel of papeis) {
        expect(validos.has(papel)).toBe(true);
      }
    }
  });
});
