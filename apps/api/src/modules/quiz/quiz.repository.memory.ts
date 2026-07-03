import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AreaConhecimento, BancoDeItemRegistro, QuizRepositoryPort, Tentativa } from '@notaa/contracts';
import { ITENS_SEED } from './quiz.seed-items';

interface SessaoMemoria {
  id: string;
  estudanteId: string;
  status: string;
  area: AreaConhecimento;
  expostos: string[];
}

interface TentativaMemoria extends Tentativa {
  estudanteId: string;
  area: AreaConhecimento;
}

/**
 * ⚠️ Adaptador EM MEMÓRIA — dev/test double (mesmo aviso de
 * onboarding.repository.memory.ts). Substituir por adaptador Drizle real
 * (tentativa_resposta, sessao_avaliativa, habilidade_estudante, banco_de_itens
 * — doc 04 §4) quando o projeto Supabase existir.
 */
@Injectable()
export class QuizRepositoryMemory implements QuizRepositoryPort {
  private readonly sessoes = new Map<string, SessaoMemoria>();
  private readonly habilidades = new Map<string, { theta: number; erroPadrao: number }>();
  private readonly idempotencyKeysVistas = new Set<string>();
  private readonly tentativas: TentativaMemoria[] = [];
  private readonly perguntasIA: { estudanteId: string; area: AreaConhecimento; enunciado: string }[] = [];

  async createSession(estudanteId: string, area: AreaConhecimento): Promise<{ sessaoId: string }> {
    const id = randomUUID();
    this.sessoes.set(id, { id, estudanteId, status: 'em_andamento', area, expostos: [] });
    return { sessaoId: id };
  }

  async getSession(sessaoId: string) {
    const sessao = this.sessoes.get(sessaoId);
    if (!sessao) return null;
    return {
      id: sessao.id,
      estudanteId: sessao.estudanteId,
      status: sessao.status,
      area: sessao.area,
    };
  }

  async getHabilidade(estudanteId: string, area: AreaConhecimento) {
    return this.habilidades.get(`${estudanteId}:${area}`) ?? { theta: 0, erroPadrao: 1 };
  }

  async setHabilidade(
    estudanteId: string,
    area: AreaConhecimento,
    theta: number,
    erroPadrao: number,
    // tentativaId não é persistido aqui — este adaptador não modela theta_evento
    // (histórico append-only), só o estado atual (suficiente para dev/test).
    _tentativaId?: string,
  ) {
    this.habilidades.set(`${estudanteId}:${area}`, { theta, erroPadrao });
  }

  async getItemPool(area: AreaConhecimento): Promise<BancoDeItemRegistro[]> {
    return ITENS_SEED.filter((i) => i.area === area);
  }

  async getItem(itemId: string): Promise<BancoDeItemRegistro | null> {
    return ITENS_SEED.find((i) => i.itemId === itemId) ?? null;
  }

  async getExpostos(sessaoId: string): Promise<string[]> {
    return this.sessoes.get(sessaoId)?.expostos ?? [];
  }

  async recordAnswer(input: {
    sessaoId: string;
    estudanteId: string;
    itemId: string;
    resposta: string;
    acerto: boolean;
    tempoRespostaMs: number;
    idempotencyKey: string;
    temasErro?: string[];
  }): Promise<{ duplicate: boolean; tentativaId: string | null }> {
    if (this.idempotencyKeysVistas.has(input.idempotencyKey)) {
      return { duplicate: true, tentativaId: null };
    }
    this.idempotencyKeysVistas.add(input.idempotencyKey);

    const sessao = this.sessoes.get(input.sessaoId);
    if (sessao && !sessao.expostos.includes(input.itemId)) {
      sessao.expostos.push(input.itemId);
    }
    this.tentativas.push({
      itemId: input.itemId,
      acerto: input.acerto,
      tempoMs: input.tempoRespostaMs,
      criadoEm: new Date().toISOString(),
      estudanteId: input.estudanteId,
      area: sessao?.area ?? 'matematica',
    });
    return { duplicate: false, tentativaId: randomUUID() };
  }

  async finishSession(sessaoId: string): Promise<void> {
    const sessao = this.sessoes.get(sessaoId);
    if (sessao) sessao.status = 'concluida';
  }

  async getHistoricoRecente(estudanteId: string, area: AreaConhecimento, limit: number): Promise<Tentativa[]> {
    return this.tentativas
      .filter((t) => t.estudanteId === estudanteId && t.area === area)
      .slice(-limit)
      .map(({ itemId, acerto, tempoMs, criadoEm }) => ({ itemId, acerto, tempoMs, criadoEm }));
  }

  async getHistoricoPerguntasIA(estudanteId: string, area: AreaConhecimento, limit: number): Promise<string[]> {
    return this.perguntasIA
      .filter((p) => p.estudanteId === estudanteId && p.area === area)
      .slice(-limit)
      .map((p) => p.enunciado);
  }

  async registrarPerguntaIA(estudanteId: string, area: AreaConhecimento, _tema: string, enunciado: string): Promise<void> {
    this.perguntasIA.push({ estudanteId, area, enunciado });
  }
}
