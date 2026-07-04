import { Inject, Injectable, Logger } from '@nestjs/common';
import type { z } from 'zod';
import type { LLMChamadaMeta, LLMProviderPort, UsoTokens } from '@notaa/contracts';
import { Database, and, eq, logUsoIa, promptVersionado } from '@notaa/db';
import { CATALOGO_PROMPTS } from '@notaa/prompts';
import { DB_CLIENT } from '../../db/db.tokens';
import { GeminiAdapter } from './gemini.adapter';

/**
 * Decorator do portão único de IA (doc 06 §1 + doc 10 §5, auditoria R7):
 * delega ao provedor real e grava UMA linha em `log_uso_ia` por chamada —
 * sucesso ou falha — com tokens, custo estimado, latência e versão de prompt.
 *
 * O log é best-effort: falha ao gravar nunca derruba a chamada de IA (warn).
 * Chamadas sem `usuarioId` não são logadas (a coluna é NOT NULL) — hoje só a
 * rota de diagnóstico admin cai nesse caso.
 */
@Injectable()
export class LlmUsageLoggerProvider implements LLMProviderPort {
  private readonly logger = new Logger('LlmUsageLogger');
  /** Cache (integracao:versao → uuid) das linhas de prompt_versionado já resolvidas. */
  private readonly promptIdCache = new Map<string, string>();

  constructor(
    private readonly inner: GeminiAdapter,
    @Inject(DB_CLIENT) private readonly db: Database,
  ) {}

  async complete<T>(
    input: {
      sistema: string;
      prompt?: string;
      contexto: object;
      schema: z.ZodSchema<T>;
      temperature?: number;
    } & LLMChamadaMeta,
  ): Promise<{ data: T; uso: UsoTokens }> {
    const inicio = Date.now();
    try {
      const resultado = await this.inner.complete(input);
      await this.registrar(input, { sucesso: true, uso: resultado.uso });
      return resultado;
    } catch (err) {
      await this.registrar(input, { sucesso: false, latenciaMs: Date.now() - inicio });
      throw err;
    }
  }

  async completeTexto(
    input: { sistema: string; prompt: string } & LLMChamadaMeta,
  ): Promise<{ texto: string; uso: UsoTokens }> {
    const inicio = Date.now();
    try {
      const resultado = await this.inner.completeTexto(input);
      await this.registrar(input, { sucesso: true, uso: resultado.uso });
      return resultado;
    } catch (err) {
      await this.registrar(input, { sucesso: false, latenciaMs: Date.now() - inicio });
      throw err;
    }
  }

  private async registrar(
    meta: LLMChamadaMeta,
    resultado: { sucesso: boolean; uso?: UsoTokens; latenciaMs?: number },
  ): Promise<void> {
    if (!meta.usuarioId) return;
    try {
      await this.db.insert(logUsoIa).values({
        usuarioId: meta.usuarioId,
        integracao: meta.origem ?? 'socratica',
        promptVersaoId: await this.resolverPromptVersaoId(meta),
        tokensIn: resultado.uso?.tokensIn ?? null,
        tokensOut: resultado.uso?.tokensOut ?? null,
        custoEstimado: resultado.uso ? String(resultado.uso.custoEstimado) : null,
        sucesso: resultado.sucesso,
        latenciaMs: resultado.uso?.latenciaMs ?? resultado.latenciaMs ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `falha ao gravar log_uso_ia (origem=${meta.origem ?? '?'}): ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  /**
   * Resolve (integracao, versao) → uuid de `prompt_versionado`, registrando a
   * linha na primeira utilização a partir do catálogo de packages/prompts —
   * mantém a tabela como espelho da versão ativa em produção (doc 06 §5).
   */
  private async resolverPromptVersaoId(meta: LLMChamadaMeta): Promise<string | null> {
    if (!meta.origem || !meta.promptVersao) return null;
    const chave = `${meta.origem}:${meta.promptVersao}`;
    const emCache = this.promptIdCache.get(chave);
    if (emCache) return emCache;

    const [existente] = await this.db
      .select({ id: promptVersionado.id })
      .from(promptVersionado)
      .where(
        and(eq(promptVersionado.integracao, meta.origem), eq(promptVersionado.versao, meta.promptVersao)),
      )
      .limit(1);
    if (existente) {
      this.promptIdCache.set(chave, existente.id);
      return existente.id;
    }

    const doCatalogo = CATALOGO_PROMPTS.find(
      (p) => p.integracao === meta.origem && p.versao === meta.promptVersao,
    );
    if (!doCatalogo) return null;

    const [inserido] = await this.db
      .insert(promptVersionado)
      .values({
        integracao: doCatalogo.integracao,
        versao: doCatalogo.versao,
        conteudo: doCatalogo.conteudo,
        ativo: true,
      })
      .onConflictDoNothing()
      .returning({ id: promptVersionado.id });
    if (inserido) {
      this.promptIdCache.set(chave, inserido.id);
      return inserido.id;
    }
    return null;
  }
}
