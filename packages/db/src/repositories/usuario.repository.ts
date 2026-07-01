import { eq } from 'drizzle-orm';
import { EmailJaCadastradoError, type UsuarioRegistro, type UsuarioRepositoryPort } from '@notaa/contracts';
import type { Database } from '../client';
import { usuario } from '../schema';

// SQLSTATE 23505 = unique_violation (padrão Postgres, não específico desta lib).
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

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
    try {
      await this.db.insert(usuario).values({
        id: input.id,
        authUid: input.authUid,
        tipoPerfil: input.tipoPerfil,
        nome: input.nome,
        email: input.email,
        status: 'ativo',
      });
    } catch (err) {
      // Traduz a violação de unicidade (auth_uid OU email) para um erro de
      // domínio — a Orquestração (AuthService) decide como reagir (idempotência
      // vs. conflito real), sem depender do formato de erro do driver Postgres.
      if (isUniqueViolation(err)) {
        throw new EmailJaCadastradoError(input.email);
      }
      throw err;
    }
  }
}
