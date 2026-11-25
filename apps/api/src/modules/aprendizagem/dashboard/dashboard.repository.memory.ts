import { Injectable } from '@nestjs/common';
import type {
  AreaConhecimento,
  DashboardRepositoryPort,
  DashboardResumoPerfil,
  ThetaResumoArea,
} from '@notaa/contracts';

/** ⚠️ Adaptador EM MEMÓRIA — dev/test double (ver gamificacao.repository.memory.ts). */
@Injectable()
export class DashboardRepositoryMemory implements DashboardRepositoryPort {
  async getThetaResumo(
    _estudanteId: string,
  ): Promise<Partial<Record<AreaConhecimento, ThetaResumoArea>>> {
    return {};
  }

  async getResumoPerfil(_estudanteId: string): Promise<DashboardResumoPerfil> {
    return {
      nome: null,
      objetivoEnem: null,
      onboardingConcluido: false,
      perfil4d: null,
      redacoesEnviadas: 0,
      sessoesSocraticas: 0,
    };
  }
}
