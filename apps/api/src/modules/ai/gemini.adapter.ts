import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { z } from 'zod';
import type { LLMProviderPort, UsoTokens } from '@notaa/contracts';

/**
 * Adaptador real do `LLMProviderPort` (doc 06 §1) usando o Gemini do Google.
 * Implementa exatamente o mesmo contrato do `LLMProviderMock`: recebe um prompt
 * de sistema + contexto + schema Zod e devolve dados JÁ validados pelo schema
 * (I5 — resposta estruturada), nunca texto cru.
 *
 * Wiring: por enquanto é apenas um provider injetável (consumido por AiController
 * na rota de fumaça /ai/test). Para promovê-lo a provedor padrão de produção,
 * troque `useClass: LLMProviderMock` por `useClass: GeminiAdapter` no token
 * LLM_PROVIDER (ai.module.ts) — nenhum outro arquivo muda (hexagonal).
 *
 * Config via ambiente:
 *   - GEMINI_API_KEY (obrigatória)
 *   - GEMINI_MODEL   (opcional; default 'gemini-2.0-flash')
 */
@Injectable()
export class GeminiAdapter implements LLMProviderPort {
  private readonly logger = new Logger('LLMProvider');
  private readonly modelo = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

  async complete<T>(input: {
    sistema: string;
    contexto: object;
    schema: z.ZodSchema<T>;
  }): Promise<{ data: T; uso: UsoTokens }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Falha de configuração do ambiente, não do cliente.
      throw new Error('GEMINI_API_KEY não configurado no ambiente da API.');
    }

    const inicio = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelo,
      systemInstruction: input.sistema,
      // Força JSON: combina com a validação Zod a seguir para garantir I5.
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt =
      `Contexto (JSON):\n${JSON.stringify(input.contexto)}\n\n` +
      'Responda SOMENTE com um objeto JSON válido conforme o contrato do sistema, sem texto fora do JSON.';

    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      this.logger.error('✗ resposta Gemini não é JSON válido.');
      throw new Error('[GeminiAdapter] Resposta do provedor não é JSON válido.');
    }

    // Mesma rede de segurança do mock: se a resposta não bate com o schema, é um
    // contrato quebrado — falha explícita, não dado silenciosamente inválido.
    const parsed = input.schema.safeParse(json);
    if (!parsed.success) {
      this.logger.error(`✗ resposta Gemini reprovada no schema: ${parsed.error.message}`);
      throw new Error(
        `[GeminiAdapter] Resposta não passou na validação do schema: ${parsed.error.message}`,
      );
    }

    const usage = result.response.usageMetadata;
    const uso: UsoTokens = {
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
      custoEstimado: 0, // calibrado por modelo numa fase posterior (doc 06).
      latenciaMs: Date.now() - inicio,
    };
    this.logger.log(
      `← resposta IA [gemini:${this.modelo}] OK | tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
    );

    return { data: parsed.data, uso };
  }

  /**
   * Agente 1 — geração de TEXTO LIVRE para o tutor socrático direto
   * (POST /socratic/chat). Diferente de `complete()`, NÃO força JSON nem valida
   * schema: devolve a resposta do Gemini como string, guiada pelo
   * `systemInstruction` (montado pelo StudentContextService com o perfil do aluno).
   */
  async generateSocraticResponse(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurado no ambiente da API.');
    }

    const inicio = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: this.modelo, systemInstruction });

    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    const usage = result.response.usageMetadata;
    this.logger.log(
      `← socrático [gemini:${this.modelo}] tokensIn=${usage?.promptTokenCount ?? 0} tokensOut=${usage?.candidatesTokenCount ?? 0} latenciaMs=${Date.now() - inicio}`,
    );

    return texto;
  }
}
