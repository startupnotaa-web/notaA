import { describe, expect, it } from 'vitest';
import { RiskDetectorService } from '../../ai/risk-detector.service';
import { SocraticService } from '../socratic.service';

// I3/I6 na rota stateless POST /socratic/chat (doc 06 §2.3) — mesma garantia da
// rota persistida: a resposta final NUNCA chega ao aluno e sinal de risco desvia
// para o protocolo de cuidado ANTES do provedor.

function makeService(respostaGemini: string) {
  const chamadas = { gemini: 0, ocorrencias: [] as string[], sistemas: [] as string[] };
  const risk = new RiskDetectorService({
    registrarOcorrencia: async (input: { sinal: string }) => {
      chamadas.ocorrencias.push(input.sinal);
      return { ocorrenciaId: 'oc-teste' };
    },
  } as never);
  const service = new SocraticService(
    null as never, // repo — não usado pelo chatDireto
    null as never, // db — não usado pelo chatDireto
    {
      completeTexto: async (input: { sistema: string }) => {
        chamadas.gemini += 1;
        chamadas.sistemas.push(input.sistema);
        return {
          texto: respostaGemini,
          uso: { tokensIn: 0, tokensOut: 0, custoEstimado: 0, latenciaMs: 0 },
        };
      },
    } as never, // llm (LLM_PROVIDER)
    risk,
    { montarBloco: async () => '## Sobre este aluno\n- Nome/idade/série: Davi.' } as never, // studentProfile
  );
  return { service, chamadas };
}

describe('SocraticService.chatDireto — guardrails da rota stateless', () => {
  it('usa o prompt versionado do canal com o bloco do aluno e formato texto', async () => {
    const { service, chamadas } = makeService('O que você já sabe sobre isso?');
    await service.chatDireto('est-1', 'como resolvo 2x = 10?');

    const sistema = chamadas.sistemas[0]!;
    expect(sistema).toContain('NUNCA entregue a resposta final');
    expect(sistema).toContain('Nome/idade/série: Davi.');
    expect(sistema).toContain('Responda em texto puro');
    expect(sistema).not.toContain('{{');
  });

  it('I3: rebaixa para fallback guiado quando o Gemini entrega a resposta final', async () => {
    const { service } = makeService('Fácil! A resposta correta é a alternativa C, porque 2x=10.');
    const out = await service.chatDireto('est-1', 'me dá a resposta da questão?');

    expect(out.resposta).not.toContain('alternativa C');
    expect(out.resposta).toContain('vou segurar a resposta');
  });

  it('I3: deixa passar uma pergunta-guia legítima sem alterar', async () => {
    const guia = 'O que acontece se você isolar o x dos dois lados da equação?';
    const { service } = makeService(guia);
    const out = await service.chatDireto('est-1', 'como resolvo 2x = 10?');

    expect(out.resposta).toBe(guia);
    expect(out.origem).toBe('gemini');
  });

  it('I6: sinal de risco desvia para care_protocol SEM chamar o Gemini', async () => {
    const { service, chamadas } = makeService('qualquer coisa');
    const out = await service.chatDireto('est-1', 'não aguento mais viver');

    expect(out.origem).toBe('care_protocol');
    expect(out.resposta).toContain('CVV');
    expect(chamadas.gemini).toBe(0);
    expect(chamadas.ocorrencias.length).toBe(1);
  });
});
