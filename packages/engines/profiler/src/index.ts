// Cognitive Profiler (E3) — TS puro, sem infra (doc 03 §2, doc 09 §2).
export { clampEixo, clampConfianca, confiancaPorVolume, PERFIL_NEUTRO } from './model';
export {
  SINAL_RESPOSTA_QUIZ,
  aplicarSinalRespostaQuiz,
  gerarRecomendacoes,
  isSinalRespostaQuiz,
} from './sinal-quiz';
export type { SinalRespostaQuiz } from './sinal-quiz';
export { update, cognitiveProfiler } from './update';
