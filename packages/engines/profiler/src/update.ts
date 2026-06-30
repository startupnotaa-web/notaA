import type { CognitiveProfiler, Perfil4D, SinalComportamental } from '@notaa/contracts';
import { confiancaPorVolume } from './model';
import { aplicarSinalRespostaQuiz, gerarRecomendacoes, isSinalRespostaQuiz } from './sinal-quiz';

/**
 * Implementação de CognitiveProfiler (doc 05 §9). Sinais de tipo desconhecido
 * são ignorados silenciosamente (não geram ruído nem erro) — outros tipos de
 * sinal chegam em fases futuras (autopercepção do onboarding, Detector de
 * Padrão de Erro, navegação na Socrática).
 *
 * `confianca` aqui é calculada SÓ a partir do lote de sinais desta chamada —
 * é uma confiança "local". A camada de Orquestração (ProfilerService) é quem
 * mantém a confiança acumulada entre chamadas (via perfil_cognitivo_4d.confianca),
 * combinando-a com este resultado por média móvel — motores TS puros não
 * guardam estado entre chamadas (doc 03 §2).
 */
export function update(input: { atual: Perfil4D; sinais: SinalComportamental[] }): {
  perfil: Perfil4D;
  confianca: number;
  recomendacoes: ReturnType<typeof gerarRecomendacoes>;
} {
  let perfil = input.atual;
  let aplicados = 0;

  for (const sinal of input.sinais) {
    if (isSinalRespostaQuiz(sinal)) {
      const resultado = aplicarSinalRespostaQuiz(perfil, sinal.valor);
      perfil = resultado.perfil;
      if (resultado.aplicado) aplicados += 1;
    }
    // tipos desconhecidos: ignorados de propósito (ver doc no topo do arquivo).
  }

  return {
    perfil,
    confianca: confiancaPorVolume(aplicados),
    recomendacoes: gerarRecomendacoes(perfil),
  };
}

export const cognitiveProfiler: CognitiveProfiler = { update };
