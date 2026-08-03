import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../../common/decorators/roles.decorator';
import { GeminiAdapter } from './gemini.adapter';

// Schema mínimo só para a rota de fumaça — exercita o caminho completo do
// adaptador (chamada ao Gemini + validação Zod) sem depender de nenhum módulo
// de negócio.
const PingSchema = z.object({
  status: z.string(),
  mensagem: z.string(),
});

/**
 * Rotas de diagnóstico da IA. Caminho real: GET /ai/test (o rewrite da Vercel
 * manda tudo para a function e o Fastify roteia pela URL original — não há
 * prefixo /api nas rotas, apesar do arquivo viver em apps/api/api/index.ts).
 *
 * @Roles('admin'): cada chamada consome quota real do Gemini e /ai/models
 * expõe detalhes da conta Google — nunca deixar público (auditoria E3).
 */
@Roles('admin')
@Controller('ai')
export class AiController {
  constructor(private readonly gemini: GeminiAdapter) {}

  @Get('test')
  async test() {
    try {
      const { data, uso } = await this.gemini.complete({
        sistema:
          'Você é o verificador de saúde da IA da Nota A. Responda em JSON com as chaves ' +
          '{ "status": "ok", "mensagem": "<uma frase curta confirmando que a IA está ativa>" }.',
        contexto: { ping: 'Confirme que a integração com o Gemini está funcionando.' },
        schema: PingSchema,
      });
      return {
        ok: true,
        modelo: process.env.GEMINI_MODEL ?? process.env.LLM_MODEL ?? process.env.LLM_MODEL_QUIZ ?? 'gemini-3.1-flash-lite',
        resposta: data,
        uso,
      };
    } catch (err) {
      // Rota de diagnóstico: devolvemos a mensagem de erro no corpo (em vez de
      // estourar 500) para facilitar verificar a chave/config em produção.
      return {
        ok: false,
        erro: err instanceof Error ? err.message : 'Falha desconhecida ao chamar a IA.',
      };
    }
  }

  /**
   * Diagnóstico: lista os modelos que a GEMINI_API_KEY atual realmente enxerga
   * (ListModels da API do Google), filtrando os que suportam `generateContent`.
   * Serve para escolher um nome de modelo válido sem chutar (evita 404) e ver o
   * que a conta tem acesso.
   */
  /**
   * Sonda de modelo: testa um `generateContent` mínimo no modelo indicado
   * (?model=gemini-2.5-flash) ou no default. Serve para achar um modelo com
   * cota disponível sem precisar redeployar a cada tentativa.
   */
  @Get('ping')
  async ping(@Query('model') model?: string) {
    return this.gemini.ping(model);
  }

  @Get('models')
  async models() {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.LLM_API_KEY;
    if (!apiKey) {
      return { ok: false, erro: 'GEMINI_API_KEY não configurado no ambiente da API.' };
    }
    try {
      const res: any = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`,
      );
      const data: any = await res.json();
      if (!res.ok) {
        return { ok: false, status: res.status, erro: data?.error?.message ?? 'falha ao listar modelos' };
      }
      const models = Array.isArray(data.models)
        ? data.models
            .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
            .map((m: any) => m.name?.replace(/^models\//, ''))
        : [];
      return { ok: true, total: models.length, models };
    } catch (err) {
      return { ok: false, erro: err instanceof Error ? err.message : 'falha ao listar modelos' };
    }
  }
}
