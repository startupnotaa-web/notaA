/**
 * Por que o registro da conta (POST /auth/register e afins) não terminou. Função pura: a tela
 * "Concluir cadastro" escolhe o texto e a saída (tentar de novo, escolher o tipo, falar com o suporte) por
 * este motivo, e nunca manda a pessoa para um painel enquanto a conta não tem papel.
 */
export type MotivoDaFalha =
  /** E-mail já pertence a outro cadastro que não está ligado a esta conta (409). Só o suporte resolve. */
  | 'conflito'
  /** API fora do ar, erro 5xx ou sem rede. Vale tentar de novo. */
  | 'indisponivel'
  /** A API recusou os dados (4xx). Escolher o tipo de conta de novo costuma resolver. */
  | 'invalido'
  /** O token da sessão não vale mais (401). */
  | 'sessao'
  /** A conta não declarou que tipo de conta é (Google, por exemplo): é preciso perguntar. */
  | 'sem-tipo';

export type ResultadoRegistro = { ok: true } | { ok: false; motivo: MotivoDaFalha; status: number };

/** Status HTTP (0 = sem resposta) → motivo. */
export function classificarFalhaDeRegistro(status: number): MotivoDaFalha {
  if (status === 409) return 'conflito';
  if (status === 401) return 'sessao';
  if (status === 0 || status >= 500) return 'indisponivel';
  return 'invalido';
}
