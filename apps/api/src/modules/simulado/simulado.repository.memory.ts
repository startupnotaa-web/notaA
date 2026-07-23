import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AreaConhecimento } from '@notaa/contracts';

interface SimuladoSession {
  id: string;
  estudanteId: string;
  area: AreaConhecimento;
  quantidade: number;
  nivelAtual: number;
  expostos: string[];
}

@Injectable()
export class SimuladoRepositoryMemory {
  private readonly sessoes = new Map<string, SimuladoSession>();

  async createSession(
    estudanteId: string,
    area: AreaConhecimento,
    quantidade: number,
    nivelInicial: number,
  ): Promise<{ sessaoId: string }> {
    const id = randomUUID();
    this.sessoes.set(id, {
      id,
      estudanteId,
      area,
      quantidade,
      nivelAtual: nivelInicial,
      expostos: [],
    });
    return { sessaoId: id };
  }

  async getSession(sessaoId: string): Promise<SimuladoSession | null> {
    const sessao = this.sessoes.get(sessaoId);
    if (!sessao) return null;
    return sessao;
  }

  async addExposto(sessaoId: string, itemId: string): Promise<void> {
    const sessao = this.sessoes.get(sessaoId);
    if (sessao && !sessao.expostos.includes(itemId)) {
      sessao.expostos.push(itemId);
    }
  }

  async setNivelAtual(sessaoId: string, nivel: number): Promise<void> {
    const sessao = this.sessoes.get(sessaoId);
    if (sessao) {
      sessao.nivelAtual = nivel;
    }
  }
}
