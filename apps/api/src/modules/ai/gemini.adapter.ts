import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { LLMChamadaMeta, LLMProviderPort, UsoTokens } from '@notaa/contracts';

// Resiliência (doc 06 §2.4/§3.3, auditoria R1): toda chamada ao provedor tem
// teto de espera e re-tenta erros transitórios com backoff. Sem isso, uma
// lentidão do Gemini segura a function serverless até o timeout da plataforma.
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 15_000);
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 500;

// Fallback quando o chamador não passa `modelo` no input (LLMChamadaMeta) —
// hoje só battle.service.ts e study-trails.service.ts caem aqui; socrática,
// redação e quiz sempre passam seu próprio LLM_MODEL_* (ver serviços).
export const DEFAULT_MODEL = 'gemini-2.5-flash';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Configuração ausente é diferente de indisponibilidade temporária do Gemini. */
export class GeminiConfigurationError extends Error {
  constructor() {
    super('GEMINI_API_KEY não configurado no ambiente da API.');
    this.name = 'GeminiConfigurationError';
  }
}

/**
 * Transitório = vale re-tentar: rate limit (429), indisponibilidade do provedor
 * (5xx) e falhas de rede/timeout. Erros de contrato (schema, JSON inválido) e de
 * configuração (chave ausente, modelo inexistente/404) NÃO são re-tentados.
 */
export function isErroTransitorio(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIFetchError) {
    return err.status === 429 || (err.status != null && err.status >= 500);
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|timed out|fetch failed|network|econnreset|socket|aborted/i.test(msg);
}

function diagnosticoErro(err: unknown): string {
  const error = err as { status?: unknown; code?: unknown; message?: unknown; response?: unknown };
  const status = typeof error?.status === 'number' ? error.status : 'n/a';
  const code = typeof error?.code === 'string' ? error.code : 'n/a';
  const message = err instanceof Error ? err.message : String(error?.message ?? err);
  return `status=${status} code=${code} message=${message}`;
}

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
 *   - GEMINI_API_KEY    (obrigatória)
 *   - GEMINI_MODEL      (opcional; default 'gemini-3.1-flash-lite')
 *   - GEMINI_TIMEOUT_MS (opcional; default 15000)
 */
@Injectable()
export class GeminiAdapter implements LLMProviderPort, OnModuleInit {
  private readonly logger = new Logger('LLMProvider');
  private readonly modeloPadrao = process.env.GEMINI_MODEL ?? process.env.LLM_MODEL ?? 'gemini-3.1-flash-lite';

  // O .env atual do projeto usa LLM_*. GEMINI_* continua suportado para novos
  // ambientes, mas a chave/modelo legados não podem ser ignorados em runtime.
  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY ?? process.env.LLM_API_KEY;
  }

  private get apiKeySource(): 'GEMINI_API_KEY' | 'LLM_API_KEY' | 'ausente' {
    if (process.env.GEMINI_API_KEY) return 'GEMINI_API_KEY';
    if (process.env.LLM_API_KEY) return 'LLM_API_KEY';
    return 'ausente';
  }

  private modeloPara(origem?: LLMChamadaMeta['origem']): string {
    const porIntegracao = {
      socratica: process.env.GEMINI_MODEL_SOCRATICA ?? process.env.LLM_MODEL_SOCRATICA,
      redacao: process.env.GEMINI_MODEL_REDACAO ?? process.env.LLM_MODEL_REDACAO,
      quiz: process.env.GEMINI_MODEL_QUIZ ?? process.env.LLM_MODEL_QUIZ,
      batalha: process.env.GEMINI_MODEL_BATALHA ?? process.env.LLM_MODEL_BATALHA,
      trilha: process.env.GEMINI_MODEL_TRILHA ?? process.env.LLM_MODEL_TRILHA,
    } as const;
    return (origem ? porIntegracao[origem] : undefined) ?? this.modeloPadrao;
  }

  /**
   * Executa uma chamada ao provedor com retry + backoff exponencial para erros
   * transitórios (429/5xx/rede). Erros definitivos sobem na primeira tentativa.
   */
  private async comRetry<T>(rotulo: string, op: () => Promise<T>): Promise<T> {
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await op();
      } catch (err) {
        if (!isErroTransitorio(err) || tentativa >= MAX_RETRIES) throw err;
        const esperaMs = BACKOFF_BASE_MS * 2 ** tentativa;
        this.logger.warn(
          `↻ erro transitório em ${rotulo} (tentativa ${tentativa + 1}/${MAX_RETRIES + 1}): ` +
            `${err instanceof Error ? err.message : String(err)} — nova tentativa em ${esperaMs}ms`,
        );
        await sleep(esperaMs);
      }
    }
  }

  async complete<T>(input: {
    sistema: string;
    prompt?: string;
    contexto: object;
    schema: z.ZodSchema<T>;
    temperature?: number;
  } & LLMChamadaMeta): Promise<{ data: T; uso: UsoTokens }> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new GeminiConfigurationError();
    }
    const modelo = input.modelo ?? DEFAULT_MODEL;

    const inicio = Date.now();
    const modelo = this.modeloPara(input.origem);
    this.logger.log(
      `[IA_DIAGNOSTICO] etapa=inicio origem=${input.origem ?? 'desconhecida'} modelo=${modelo} chave=${this.apiKeySource}`,
    );
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      {
        model: modelo,
        model: modelo,
        systemInstruction: input.sistema,
        // Força JSON: combina com a validação Zod a seguir para garantir I5.
        generationConfig: {
          responseMimeType: 'application/json',
          ...(input.temperature != null ? { temperature: input.temperature } : {}),
        },
      },
      { timeout: GEMINI_TIMEOUT_MS },
    );

    const jsonSchema = zodToJsonSchema(input.schema as any, 'ResponseSchema');
    const prompt =
      (input.prompt ? `Input do Usuário: ${input.prompt}\n\n` : '') +
      `Contexto (JSON):\n${JSON.stringify(input.contexto)}\n\n` +
      `Contrato Esperado (JSON Schema):\n${JSON.stringify(jsonSchema)}\n\n` +
      'Responda SOMENTE com um objeto JSON válido estritamente aderente ao JSON Schema acima, sem texto fora do JSON.';

    let result;
    try {
      result = await this.comRetry('complete', () => model.generateContent(prompt));
    } catch (error) {
      this.logger.error(
        `[IA_DIAGNOSTICO] etapa=generateContent origem=${input.origem ?? 'desconhecida'} modelo=${modelo} ${diagnosticoErro(error)}`,
      );
      throw error;
    }
    const texto = result.response.text();

    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      this.logger.error(
        `[IA_DIAGNOSTICO] etapa=json_parse origem=${input.origem ?? 'desconhecida'} modelo=${modelo} ` +
          `tamanho_resposta=${texto.length} inicio=${JSON.stringify(texto.slice(0, 300))}`,
      );
      throw new Error('[GeminiAdapter] Resposta do provedor não é JSON válido.');
    }

    // Mesma rede de segurança do mock: se a resposta não bate com o schema, é um
    // contrato quebrado — falha explícita, não dado silenciosamente inválido.
    const parsed = input.schema.safeParse(json);
    if (!parsed.success) {
      this.logger.error(
        `[IA_DIAGNOSTICO] etapa=zod_schema origem=${input.origem ?? 'desconhecida'} modelo=${modelo} ` +
          `erros=${parsed.error.message} resposta=${JSON.stringify(json).slice(0, 1000)}`,
      );
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
      `← resposta IA [gemini:${modelo}] OK | tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
      `← resposta IA [gemini:${modelo}] OK | tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
    );

    return { data: parsed.data, uso };
  }

  /**
   * Geração de TEXTO LIVRE (LLMProviderPort.completeTexto) — tutor socrático
   * direto (POST /socratic/chat). Diferente de `complete()`, NÃO força JSON nem
   * valida schema: devolve a resposta do Gemini como string, guiada pelo
   * `sistema` (montado pelo StudentContextService com o perfil do aluno).
   */
  async completeTexto(input: {
    sistema: string;
    prompt: string;
  } & LLMChamadaMeta): Promise<{ texto: string; uso: UsoTokens }> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new GeminiConfigurationError();
    }
    const modelo = input.modelo ?? DEFAULT_MODEL;

    const inicio = Date.now();
    const modelo = this.modeloPara(input.origem);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      { model: modelo, systemInstruction: input.sistema },
      { model: modelo, systemInstruction: input.sistema },
      { timeout: GEMINI_TIMEOUT_MS },
    );

    const result = await this.comRetry('socratico', () => model.generateContent(input.prompt));
    const texto = result.response.text();

    const usage = result.response.usageMetadata;
    const uso: UsoTokens = {
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
      custoEstimado: 0,
      latenciaMs: Date.now() - inicio,
    };
    this.logger.log(
      `← socrático [gemini:${modelo}] tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
      `← socrático [gemini:${modelo}] tokensIn=${uso.tokensIn} tokensOut=${uso.tokensOut} latenciaMs=${uso.latenciaMs}`,
    );

    return { texto, uso };
  }

  /**
   * Diagnóstico: faz uma geração mínima com o modelo indicado (ou o default) e
   * devolve ok/erro — permite descobrir qual modelo a chave atende COM cota,
   * sem redeployar (via GET /ai/ping?model=...).
   */
  async ping(modelName?: string): Promise<{ ok: boolean; modelo: string; texto?: string; erro?: string }> {
    const apiKey = this.apiKey;
    const modelo = modelName?.trim() || this.modeloPara('quiz');
    if (!apiKey) {
      return { ok: false, modelo, erro: 'LLM_API_KEY não configurado no ambiente da API.' };
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelo }, { timeout: GEMINI_TIMEOUT_MS });
      const result = await model.generateContent('Responda apenas com a palavra: OK');
      return { ok: true, modelo, texto: result.response.text().slice(0, 80) };
    } catch (err) {
      return { ok: false, modelo, erro: err instanceof Error ? err.message : 'falha ao chamar a IA' };
    }
  }
}
