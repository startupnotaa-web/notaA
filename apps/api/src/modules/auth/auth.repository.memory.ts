import { Injectable } from '@nestjs/common';
import type {
  AuthAdminPort,
  InstituicaoRepositoryPort,
  Papel,
  UsuarioRegistro,
  UsuarioRepositoryPort,
} from '@notaa/contracts';

/** ⚠️ Adaptadores EM MEMÓRIA — dev/test doubles (ver gamificacao.repository.memory.ts). */
@Injectable()
export class UsuarioRepositoryMemory implements UsuarioRepositoryPort {
  private readonly porAuthUid = new Map<string, UsuarioRegistro>();

  async findByAuthUid(authUid: string): Promise<UsuarioRegistro | null> {
    return this.porAuthUid.get(authUid) ?? null;
  }

  async create(input: {
    id: string;
    authUid: string;
    tipoPerfil: Papel;
    nome: string;
    email: string;
    instituicaoId?: string | null;
  }) {
    this.porAuthUid.set(input.authUid, { id: input.id, tipoPerfil: input.tipoPerfil });
  }
}

@Injectable()
export class InstituicaoRepositoryMemory implements InstituicaoRepositoryPort {
  readonly criadas: { id: string; nome: string; adminId: string }[] = [];

  async criarParaAdmin(input: { nome: string; adminId: string }): Promise<{ id: string; nome: string }> {
    const id = `instituicao-${this.criadas.length + 1}`;
    this.criadas.push({ id, nome: input.nome, adminId: input.adminId });
    return { id, nome: input.nome };
  }
}

@Injectable()
export class AuthAdminMemory implements AuthAdminPort {
  readonly chamadas: { authUid: string; papel: Papel; instituicaoId: string | null }[] = [];

  async setPapel(authUid: string, papel: Papel, instituicaoId: string | null): Promise<void> {
    this.chamadas.push({ authUid, papel, instituicaoId });
  }
}
