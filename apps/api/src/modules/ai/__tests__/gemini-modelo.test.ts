import { describe, expect, it } from 'vitest';
import { MODELO_FALLBACK, nomeDeModeloValido, resolverModelo } from '../gemini.adapter';

// Regressão de produção (2026-10-24): LLM_MODEL_QUIZ continha uma chave de API em
// vez de um nome de modelo. O Google respondia 400 "unexpected model name format"
// e o quiz devolvia 503 genérico em toda sessão.

const PADRAO = 'gemini-3.1-flash-lite';
// Valor sintético com o formato de uma chave (maiúsculas, pontos, 40+ chars).
const PARECE_CHAVE = 'AQ.Xx1Yy2Zz3Aa4Bb5Cc6Dd7Ee8Ff9Gg0Hh1Ii2Jj3Kk4Ll5Mm6Nn7';

describe('nomeDeModeloValido', () => {
  it.each(['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'models/gemini-2.5-flash', 'gemma-3-27b-it'])(
    'aceita %s',
    (nome) => expect(nomeDeModeloValido(nome)).toBe(true),
  );

  it.each([PARECE_CHAVE, 'AIzaSyFAKEFAKEFAKE', '', ' gemini-2.5-flash', 'gemini 2.5', 'Gemini-2.5-Flash'])(
    'rejeita %j',
    (nome) => expect(nomeDeModeloValido(nome)).toBe(false),
  );
});

describe('resolverModelo', () => {
  it('mantém um modelo válido', () => {
    expect(resolverModelo('gemini-2.5-flash', PADRAO)).toEqual({ modelo: 'gemini-2.5-flash', substituido: false });
  });

  it('troca um valor que parece chave pelo modelo padrão', () => {
    expect(resolverModelo(PARECE_CHAVE, PADRAO)).toEqual({ modelo: PADRAO, substituido: true });
  });

  it('usa o fallback fixo quando o próprio padrão também é inválido', () => {
    expect(resolverModelo(PARECE_CHAVE, PARECE_CHAVE)).toEqual({ modelo: MODELO_FALLBACK, substituido: true });
  });

  it('nunca devolve o valor inválido', () => {
    expect(resolverModelo(PARECE_CHAVE, PADRAO).modelo).not.toContain('AQ.');
  });
});
