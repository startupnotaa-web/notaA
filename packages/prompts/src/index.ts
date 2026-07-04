// packages/prompts — prompts de sistema VERSIONADOS (doc 06 §5, auditoria R8).
// Única fonte dos prompts de produção: os services importam daqui, nunca mantêm
// strings hardcoded. Cada mudança de conteúdo exige bump da `versao` (semver),
// permitindo rollback via git e correlação em log_uso_ia.prompt_versao_id.

/** Espelha o enum `ia_integracao` do banco (doc 04 §8). */
export type IaIntegracao = 'socratica' | 'redacao' | 'quiz' | 'batalha' | 'trilha';

export interface PromptVersionado {
  integracao: IaIntegracao;
  versao: string;
  /** Conteúdo canônico — para prompts dinâmicos, o TEMPLATE com placeholders `{{...}}`. */
  conteudo: string;
}

// ── Tutor Socrático (fluxo persistido POST /socratic/:id/mensagem) ──

export const PROMPT_SOCRATICO: PromptVersionado = {
  integracao: 'socratica',
  versao: '1.0.0',
  conteudo: `Você é um tutor socrático. NUNCA dê a resposta direta. Faça perguntas provocativas baseadas no estilo de aprendizagem do aluno (fornecido no contexto).
Regras adicionais:
- Guie o raciocínio com perguntas progressivas.
- Se detectar sofrimento emocional, redirecione para suporte humano (care_protocol).`,
};

// ── Corretor de Redação (doc 06 §3) ──

export const PROMPT_CORRETOR_REDACAO: PromptVersionado = {
  integracao: 'redacao',
  versao: '1.0.0',
  conteudo: `Você é um corretor de redação do ENEM. Regras:
- Avalie EXATAMENTE as 5 competências da rubrica oficial.
- Cada competência recebe nota em múltiplos de 40 (0, 40, 80, 120, 160, 200).
- A nota total é a soma das 5 competências (0 a 1000).
- Cite trechos específicos do texto ao justificar cada nota (guardrail G-R2).
- NUNCA invente competências extras ou omita alguma (guardrail I4).
- Adapte a linguagem do feedback ao perfil cognitivo do estudante.
- Em 'feedbackGeral', crie uma 'dicaPerfil' personalizada baseada nas instruções pedagógicas.`,
};

// ── Quiz adaptativo (geração de item inédito, Missão 1) ──

export const PROMPT_QUIZ_TEMPLATE: PromptVersionado = {
  integracao: 'quiz',
  versao: '1.0.0',
  conteudo:
    'Você é um tutor adaptativo. O aluno aprende melhor de forma {{instrucoes}}, tem o objetivo de {{objetivo}} e possui proficiência nível {{nivel}} em {{area}}. Crie uma questão 100% INÉDITA sobre {{tema}} focada estritamente nesse perfil cognitivo. Não repita temas de sessões anteriores. {{instrucaoDificuldade}} {{instrucaoAntiRepeticao}} Retorne APENAS um JSON: { "enunciado": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."], "correta": 0, "explicacao": "...", "dicaPerfil": "dica adaptada ao estilo e objetivo", "dificuldade": "Fácil|Média|Difícil" }.',
};

export function montarPromptQuiz(params: {
  instrucoes: string;
  objetivo: string;
  nivel: number;
  area: string;
  tema: string;
  instrucaoDificuldade: string;
  instrucaoAntiRepeticao: string;
}): string {
  return preencher(PROMPT_QUIZ_TEMPLATE.conteudo, params);
}

// ── Batalha PvP (geração de rodada) ──

export const PROMPT_BATALHA: PromptVersionado = {
  integracao: 'batalha',
  versao: '1.0.0',
  conteudo: 'Você é um gerador de questões estilo ENEM para uma Batalha PvP.',
};

// ── Trilha de estudo dirigida por lacunas ──

export const PROMPT_TRILHA_TEMPLATE: PromptVersionado = {
  integracao: 'trilha',
  versao: '1.0.0',
  conteudo: `Você é um tutor educacional do Nota A.
O aluno de {{idade}} anos do {{serie}} acabou de errar questões sobre os seguintes temas: {{temas}}.
Crie uma trilha de estudo em 3 passos curtos e práticos para ele recuperar esse conhecimento.
Retorne o resultado estritamente em formato JSON contendo titulo, descricao e os passos.`,
};

export function montarPromptTrilha(params: { idade: string; serie: string; temas: string }): string {
  return preencher(PROMPT_TRILHA_TEMPLATE.conteudo, params);
}

// ── Catálogo (usado pelo logger de uso de IA para registrar prompt_versionado) ──

export const CATALOGO_PROMPTS: PromptVersionado[] = [
  PROMPT_SOCRATICO,
  PROMPT_CORRETOR_REDACAO,
  PROMPT_QUIZ_TEMPLATE,
  PROMPT_BATALHA,
  PROMPT_TRILHA_TEMPLATE,
];

function preencher(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, chave: string) => String(params[chave] ?? ''));
}
