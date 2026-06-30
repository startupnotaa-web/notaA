import { eq } from 'drizzle-orm';
import type { UsuarioRegistro, UsuarioRepositoryPort } from '@notaa/contracts';
import type { Database } from '../client';
import { usuario } from '../schema';

/** Adaptador Drizzle real de UsuarioRepositoryPort (doc 04 §2) — bootstrap de registro (E1). */
export class UsuarioRepositoryDb implements UsuarioRepositoryPort {
  constructor(private readonly db: Database) {}

  async findByAuthUid(authUid: string): Promise<UsuarioRegistro | null> {
    const [row] = await this.db
      .select({ id: usuario.id, tipoPerfil: usuario.tipoPerfil })
      .from(usuario)
      .where(eq(usuario.authUid, authUid))
      .limit(1);
    if (!row) return null;
    return row;
  }

  async create(input: {
    id: string;
    authUid: string;
    tipoPerfil: UsuarioRegistro['tipoPerfil'];
    nome: string;
    email: string;
  }): Promise<void> {
    await this.db.insert(usuario).values({
      id: input.id,
      authUid: input.authUid,
      tipoPerfil: input.tipoPerfil,
      nome: input.nome,
      email: input.email,
      status: 'ativo',
    });
  }
}
