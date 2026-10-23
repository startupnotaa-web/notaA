'use client';

import type { Papel } from '@notaa/contracts';
import { useAuth } from './auth-context';
import { decidirAcesso, type Acesso } from './destino';

/**
 * Guarda de tela por papel. O papel é o do token da sessão (`app_metadata`), não o de `GET /me`: se
 * `/me` falhar ou vier de um snapshot velho, ninguém é tratado como "papel errado". É experiência;
 * quem autoriza é o servidor (RolesGuard + RBAC + RLS).
 */
export function useGuardaDePapel(permitidos: readonly Papel[]): Acesso {
  const { session, loading } = useAuth();
  return decidirAcesso(
    { carregando: loading, temSessao: !!session, papelNoToken: session?.user.app_metadata?.papel },
    permitidos,
  );
}
