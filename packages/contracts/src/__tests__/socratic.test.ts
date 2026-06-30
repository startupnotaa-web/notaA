import { describe, expect, it } from 'vitest';
import { SocraticResponseSchema } from '../socratic';

describe('SocraticResponseSchema (I3 — união discriminada por tipo, doc 05 §7)', () => {
  it('aceita guidance (caso normal)', () => {
    const result = SocraticResponseSchema.safeParse({
      tipo: 'guidance',
      mensagem: 'O que acontece se você isolar x primeiro?',
      estado: 'GerarPerguntaGuia',
      passo: 2,
    });
    expect(result.success).toBe(true);
  });

  it('aceita care_protocol com recursos de apoio (I6)', () => {
    const result = SocraticResponseSchema.safeParse({
      tipo: 'care_protocol',
      mensagem: 'Você não está sozinho(a).',
      recursos: [{ nome: 'CVV', contato: '188', url: 'https://cvv.org.br' }],
      escalonamento: 'responsavel_escola',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita um tipo desconhecido fora da união', () => {
    const result = SocraticResponseSchema.safeParse({
      tipo: 'resposta_direta', // não existe — guardrail estrutural (I3)
      mensagem: 'A resposta é x=5',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita guidance sem o campo passo (estrutura incompleta)', () => {
    const result = SocraticResponseSchema.safeParse({
      tipo: 'guidance',
      mensagem: 'Dica',
      estado: 'GerarPerguntaGuia',
    });
    expect(result.success).toBe(false);
  });
});
