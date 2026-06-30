import type { ItemParams } from '@notaa/contracts';
import { clampTheta, informacaoFisher, probabilidadeAcerto } from './model';

/**
 * Atualização incremental de θ após UMA resposta — passo de Newton sobre a
 * log-verossimilhança, escalado pela informação de Fisher do item naquele
 * ponto: θ' = θ + (resultado − P(θ)) / I(θ).
 *
 * ⚠️ Limitação conhecida: esta função é stateless (não recebe histórico nem
 * erro_padrao anterior — doc 05 §9 não inclui esses campos na assinatura).
 * O `erroPadrao` retornado é uma aproximação de UM item (1/√I), não o erro
 * acumulado da sessão inteira. Para um SE real ao longo da sessão, a camada
 * de Orquestração (passo 9+) precisa acumular informação de Fisher de cada
 * tentativa — avaliar estender esta assinatura se isso se mostrar necessário.
 *
 * `tempoMs` faz parte do contrato (doc 05 §9) mas não entra neste cálculo —
 * é relevante para o Detector de Padrão de Erro, não para o TRI.
 */
export function updateAbility(input: {
  theta: number;
  item: ItemParams;
  acerto: boolean;
  tempoMs: number;
}): { theta: number; erroPadrao: number } {
  const { theta, item, acerto } = input;
  const p = probabilidadeAcerto(theta, item);
  const informacao = informacaoFisher(theta, item);

  // Sem informação (item não discrimina neste ponto) — mantém θ, erro alto.
  if (informacao <= 0) {
    return { theta: clampTheta(theta), erroPadrao: Number.POSITIVE_INFINITY };
  }

  const resultado = acerto ? 1 : 0;
  const passo = (resultado - p) / informacao;
  const novoTheta = clampTheta(theta + passo);
  const erroPadrao = 1 / Math.sqrt(informacao);

  return { theta: novoTheta, erroPadrao };
}
