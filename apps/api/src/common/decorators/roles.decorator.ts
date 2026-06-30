import { SetMetadata } from '@nestjs/common';
import type { Papel } from '@notaa/contracts';

// @Roles('admin') restringe a rota aos papéis listados (doc 05, doc 10 §2).
// Rota autenticada SEM @Roles() = qualquer papel autenticado pode acessar
// (equivalente a "todos" no doc 05 §2, ex.: GET /me).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Papel[]) => SetMetadata(ROLES_KEY, roles);
