import { Database, eq, usuario } from '@notaa/db';

/** Situação de uma conta em `usuario.status`. `null` = não há linha para este id. */
export type StatusDeUsuario = 'ativo' | 'suspenso' | 'pendente';

export interface UsuarioStatusPort {
  statusDe(usuarioId: string): Promise<StatusDeUsuario | null>;
}

/** Adaptador real de UsuarioStatusPort: uma consulta por id. */
export class UsuarioStatusDb implements UsuarioStatusPort {
  constructor(private readonly db: Database) {}

  async statusDe(usuarioId: string): Promise<StatusDeUsuario | null> {
    const [linha] = await this.db
      .select({ status: usuario.status })
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    return linha?.status ?? null;
  }
}
