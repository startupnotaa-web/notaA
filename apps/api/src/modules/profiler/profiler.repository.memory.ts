import { Injectable } from '@nestjs/common';
import type { PerfilCognitivoState, ProfilerRepositoryPort } from '@notaa/contracts';

/** ⚠️ Adaptador EM MEMÓRIA — dev/test double (ver gamificacao.repository.memory.ts). */
@Injectable()
export class ProfilerRepositoryMemory implements ProfilerRepositoryPort {
  private readonly perfis = new Map<string, PerfilCognitivoState>();
  private readonly eventos: { estudanteId: string; estado: PerfilCognitivoState; motivo: string }[] = [];

  async getPerfil(estudanteId: string): Promise<PerfilCognitivoState | null> {
    return this.perfis.get(estudanteId) ?? null;
  }

  async upsertPerfil(estudanteId: string, estado: PerfilCognitivoState): Promise<void> {
    this.perfis.set(estudanteId, estado);
  }

  async appendEvento(estudanteId: string, estado: PerfilCognitivoState, motivo: string): Promise<void> {
    this.eventos.push({ estudanteId, estado, motivo });
  }
}
