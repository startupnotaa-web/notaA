import { Logger } from '@nestjs/common';
import type { z } from 'zod';
import type { LLMProviderPort, UsoTokens } from '@notaa/contracts';

/**
 * Mock do LLMProviderPort (doc 06 §1) — retorna respostas estáticas validadas
 * pelo schema Zod de saída. Garante que o contrato I5 (resposta estruturada)
 * funciona mesmo sem provedor real conectado.
 *
 * Para trocar por um provedor real (ex.: Gemini, OpenAI):
 *   1. Crie `gemini.adapter.ts` implementando `LLMProviderPort`
 *   2. Troque o `useClass` no `ai.module.ts`
 *   3. Nenhum outro arquivo muda (hexagonal).
 */
export class LLMProviderMock implements LLMProviderPort {
  private readonly logger = new Logger('LLMProvider');

  async complete<T>(input: {
    sistema: string;
    contexto: object;
    schema: z.ZodSchema<T>;
  }): Promise<{ data: T; uso: UsoTokens }> {
    const integracao = this.detectarIntegracao(input.sistema);
    const temPerfil4D = 'perfilCognitivo' in (input.contexto as Record<string, unknown>);
    // Log detalhado de TODA requisição de IA (portão único, doc 06 §1) — confirma
    // que o Perfil 4D foi injetado no contexto antes da chamada ao provedor.
    this.logger.log(
      `→ requisição IA [${integracao}] (mock) | perfil4D=${temPerfil4D ? 'injetado' : 'ausente'} | chaves=${Object.keys(input.contexto).join(',')}`,
    );

    // Gera um "esqueleto" da resposta baseado no schema usando defaults razoáveis.
    // Em produção, aqui entra a chamada real ao SDK do provedor.
    const mockResponse = this.gerarRespostaMock(input.sistema);

    // Valida contra o schema — se falhar, o erro é real (contrato quebrado),
    // não um bug de rede. Mesmo em mock, isso é valioso para pegar regressões.
    const parsed = input.schema.safeParse(mockResponse);
    if (!parsed.success) {
      this.logger.error(`✗ resposta IA [${integracao}] reprovada no schema: ${parsed.error.message}`);
      throw new Error(
        `[LLMProviderMock] Resposta mock não passou na validação do schema: ${parsed.error.message}`,
      );
    }

    const uso: UsoTokens = { tokensIn: 150, tokensOut: 200, custoEstimado: 0, latenciaMs: 50 };
    this.logger.log(
      `← resposta IA [${integracao}] OK | tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
    );
    return { data: parsed.data, uso };
  }

  private detectarIntegracao(sistema: string): 'socratica' | 'redacao' | 'desconhecida' {
    if (sistema.includes('socrátic') || sistema.includes('socratic') || sistema.includes('tutor')) {
      return 'socratica';
    }
    if (sistema.includes('redação') || sistema.includes('redacao') || sistema.includes('competência')) {
      return 'redacao';
    }
    return 'desconhecida';
  }

  /**
   * Heurística simples para gerar respostas mock baseadas no prompt de sistema.
   * Detecta se é chamada socrática ou de redação pelo conteúdo do sistema.
   */
  private gerarRespostaMock(sistema: string): unknown {
    if (sistema.includes('socrática') || sistema.includes('socratic') || sistema.includes('tutor')) {
      return {
        tipo: 'guidance',
        mensagem:
          'Boa pergunta! Vamos pensar juntos: se você dividir o problema em partes menores, qual seria o primeiro passo lógico?',
        estado: 'exploracao',
        passo: 1,
      };
    }

    if (sistema.includes('redação') || sistema.includes('redacao') || sistema.includes('competência')) {
      return {
        redacaoId: '00000000-0000-0000-0000-000000000000', // preenchido pelo service antes de devolver
        status: 'corrigida',
        rubricaVersao: 'v1.0-mock',
        motorVersao: 'mock-1.0',
        modeloVersao: 'mock-llm-1.0',
        notaTotal: 720,
        competencias: [
          {
            competencia: 1,
            titulo: 'Domínio da Escrita Formal',
            nota: 160,
            justificativa: 'Bom domínio da norma culta com poucos desvios.',
            citacoes: [],
          },
          {
            competencia: 2,
            titulo: 'Compreensão do Tema',
            nota: 160,
            justificativa: 'Abordagem adequada ao tema proposto.',
            citacoes: [],
          },
          {
            competencia: 3,
            titulo: 'Seleção e Organização de Argumentos',
            nota: 120,
            justificativa: 'Argumentação presente mas com repertório limitado.',
            citacoes: [],
          },
          {
            competencia: 4,
            titulo: 'Mecanismos Linguísticos de Coesão',
            nota: 160,
            justificativa: 'Uso adequado de conectivos e referenciação.',
            citacoes: [],
          },
          {
            competencia: 5,
            titulo: 'Proposta de Intervenção',
            nota: 120,
            justificativa: 'Proposta presente mas sem detalhamento completo dos 5 elementos.',
            citacoes: [],
          },
        ],
        feedbackGeral: {
          pontosFortes: [
            'Boa estrutura dissertativa com introdução, desenvolvimento e conclusão.',
            'Uso correto da norma culta na maior parte do texto.',
          ],
          pontosMelhoria: [
            'Aprofundar o repertório sociocultural com dados e citações.',
            'Detalhar os 5 elementos da proposta de intervenção (agente, ação, meio, efeito, detalhamento).',
          ],
          proximoPasso:
            'Pratique redações focando exclusivamente na Competência 5, escrevendo propostas completas.',
        },
        criadoEm: new Date().toISOString(),
      };
    }

    // Fallback genérico
    return { tipo: 'guidance', mensagem: 'Resposta mock genérica.', estado: 'inicio', passo: 1 };
  }
}
