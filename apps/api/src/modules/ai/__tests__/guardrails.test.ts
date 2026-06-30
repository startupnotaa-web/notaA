import { describe, expect, it } from 'vitest';
import { contemRespostaDireta, detectarSinalDeRisco } from '../guardrails';

// Testa o CONTEÚDO dos guardrails I3/I6 (doc 06 §2.3/§4) — o que faltava: o teste
// de contrato antigo só rejeitava um `tipo` inválido, nunca o caso real (resposta
// final embutida em `guidance.mensagem`, ou sinal de risco no texto do aluno).

describe('I6 — detectarSinalDeRisco (triagem determinística)', () => {
  it('acusa ideação de risco explícita como severidade alta', () => {
    const r = detectarSinalDeRisco('às vezes penso em me matar, não quero mais viver');
    expect(r.risco).toBe(true);
    expect(r.severidade).toBe('alta');
    expect(r.sinais.length).toBeGreaterThan(0);
  });

  it('é tolerante a acento e caixa', () => {
    expect(detectarSinalDeRisco('QUERO MORRER').risco).toBe(true);
    expect(detectarSinalDeRisco('quero morrer').risco).toBe(true);
  });

  it('classifica sofrimento mais brando como média', () => {
    const r = detectarSinalDeRisco('eu odeio minha vida e não vejo saída');
    expect(r.risco).toBe(true);
    expect(r.severidade).toBe('media');
  });

  it('NÃO dispara para dúvida normal de estudo', () => {
    expect(detectarSinalDeRisco('como eu resolvo essa equação de segundo grau?').risco).toBe(false);
    expect(detectarSinalDeRisco('queria entender melhor a Revolução Francesa').risco).toBe(false);
  });
});

describe('I3 — contemRespostaDireta (nunca a resposta final)', () => {
  it('detecta a resposta final embutida no texto', () => {
    expect(contemRespostaDireta('A resposta é x = 5, basta substituir.')).toBe(true);
    expect(contemRespostaDireta('O gabarito é a letra B.')).toBe(true);
    expect(contemRespostaDireta('Resposta: 42')).toBe(true);
  });

  it('NÃO acusa uma pergunta-guia legítima', () => {
    expect(
      contemRespostaDireta('Boa pergunta! Qual seria o primeiro passo lógico para começar?'),
    ).toBe(false);
    expect(contemRespostaDireta('O que o enunciado está pedindo, com suas palavras?')).toBe(false);
  });
});
