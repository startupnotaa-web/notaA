import { Injectable } from '@nestjs/common';
import type { AuthAdminPort, Papel, UsuarioRegistro, UsuarioRepositoryPort } from '@notaa/contracts';

/** ⚠️ Adaptadores EM MEMÓRIA — dev/test doubles (ver gamificacao.repository.memory.ts). */
@Injectable()
export class UsuarioRepositoryMemory implements UsuarioRepositoryPort {
  private readonly porAuthUid = new Map<string, UsuarioRegistro>();

  async findByAuthUid(authUid: string): Promise<UsuarioRegistro | null> {
    return this.porAuthUid.get(authUid) ?? null;
  }

  async create(input: { id: string; authUid: string; tipoPerfil: Papel; nome: string; email: string }) {
    this.porAuthUid.set(input.authUid, { id: input.id, tipoPerfil: input.tipoPerfil });
  }
}

@Injectable()
export class AuthAdminMemory implements AuthAdminPort {
  readonly chamadas: { authUid: string; papel: Papel; escolaId: string | null }[] = [];

  async setPapel(authUid: string, papel: Papel, escolaId: string | null): Promise<void> {
    this.chamadas.push({ authUid, papel, escolaId });
  }
}
