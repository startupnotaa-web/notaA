import { SetMetadata } from '@nestjs/common';
import type { Papel } from '@notaa/contracts';
import type { Feature } from '../feature-flags';

// Marca uma rota como pública (sem JWT) — ex.: /auth/register, /health.
// Doc 10 §7: default-deny — toda rota SEM @Public() exige token válido.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @Roles('admin') restringe a rota aos papéis listados (doc 05, doc 10 §2).
// Rota autenticada SEM @Roles() = qualquer papel autenticado pode acessar
// (equivalente a "todos" no doc 05 §2, ex.: GET /me).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Papel[]) => SetMetadata(ROLES_KEY, roles);

// Rotas que lidam com o PRÓPRIO contexto (listar e trocar). Se elas exigissem um `x-contexto`
// válido, quem ficou com um contexto velho (vínculo removido) não conseguiria nem listar os
// contextos que ainda tem para sair do impasse.
export const SEM_VALIDAR_CONTEXTO_KEY = 'semValidarContexto';
export const SemValidarContexto = () => SetMetadata(SEM_VALIDAR_CONTEXTO_KEY, true);

// @RequiresFeature('arena') oculta a rota enquanto a funcionalidade estiver
// desligada (common/feature-flags.ts): o FeatureGuard responde 404, como se a
// rota não existisse. Nada é removido do código nem de ROUTE_ROLES — a rota
// volta ao ar ligando a variável de ambiente.
export const FEATURE_KEY = 'feature';
export const RequiresFeature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);
