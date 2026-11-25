// Token de DI para LLMProviderPort — único ponto de acesso a qualquer provedor
// de IA generativa (doc 06 §1). Nenhum outro módulo importa SDK de IA diretamente.
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

// Token de DI para o repositório de ocorrências de risco (protocolo de cuidado
// humano, I6/doc 01 §1.5) — append-only, acesso restrito (doc 10).
export const RISK_REPOSITORY = Symbol('RISK_REPOSITORY');
