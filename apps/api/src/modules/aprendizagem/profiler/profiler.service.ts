import { Inject, Injectable } from '@nestjs/common';
import { SINAL_RESPOSTA_QUIZ, cognitiveProfiler, confiancaPorVolume, PERFIL_NEUTRO } from '@notaa/engine-profiler';
import type { CognitiveProfileResponse, PerfilCognitivoState, ProfilerRepositoryPort } from '@notaa/contracts';
import { PROFILER_REPOSITORY } from './profiler.tokens';

const CONFIANCA_TETO = 0.7; // mesmo teto do engine (model.ts) — só uma fonte de sinal na Fase 1.

/** Inverte confiancaPorVolume(n) para recuperar um `n` aproximado a partir da confiança já persistida. */
function nAproximado(confiancaAtual: number): number {
  const razao = Math.min(0.999999, Math.max(0, confiancaAtual) / CONFIANCA_TETO);
  return -20 * Math.log(1 - razao);
}

@Injectable()
export class ProfilerService {
  constructor(@Inject(PROFILER_REPOSITORY) private readonly repo: ProfilerRepositoryPort) {}

  async getPerfil(estudanteId: string): Promise<CognitiveProfileResponse> {
    const estado = await this.repo.getPerfil(estudanteId);
    const base = estado ?? { perfil: PERFIL_NEUTRO, confianca: 0, recomendacoesAtivas: [] };
    return {
      ...base.perfil,
      confianca: base.confianca,
      recomendacoesAtivas: base.recomendacoesAtivas.map((r) => r.descricao),
    };
  }

  /**
   * Hook pós-resposta de quiz (H3.1 — atualização silenciosa em background).
   * Motor é stateless; esta camada combina a confiança acumulada (persistida)
   * com o resultado do lote atual via EMA assintótica (ver nAproximado acima).
   */
  async atualizarComRespostaQuiz(
    estudanteId: string,
    sinal: { tempoMs: number; acerto: boolean },
  ): Promise<void> {
    const atual = (await this.repo.getPerfil(estudanteId)) ?? {
      perfil: PERFIL_NEUTRO,
      confianca: 0,
      recomendacoesAtivas: [],
    };

    const resultado = cognitiveProfiler.update({
      atual: atual.perfil,
      sinais: [{ tipo: SINAL_RESPOSTA_QUIZ, valor: sinal, capturadoEm: new Date().toISOString() }],
    });

    const aplicado =
      resultado.perfil.eixoReflexivoImpulsivo !== atual.perfil.eixoReflexivoImpulsivo;
    const novaConfianca = aplicado
      ? confiancaPorVolume(nAproximado(atual.confianca) + 1, CONFIANCA_TETO)
      : atual.confianca;

    const novoEstado: PerfilCognitivoState = {
      perfil: resultado.perfil,
      confianca: novaConfianca,
      recomendacoesAtivas: resultado.recomendacoes,
    };

    await this.repo.upsertPerfil(estudanteId, novoEstado);
    if (aplicado) {
      await this.repo.appendEvento(estudanteId, novoEstado, 'resposta_quiz');
    }
  }
}
