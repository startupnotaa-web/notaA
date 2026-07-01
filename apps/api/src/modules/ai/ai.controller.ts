import { Controller, Get } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { GeminiAdapter } from './gemini.adapter';

// Schema mínimo só para a rota de fumaça — exercita o caminho completo do
// adaptador (chamada ao Gemini + validação Zod) sem depender de nenhum módulo
// de negócio.
const PingSchema = z.object({
  status: z.string(),
  mensagem: z.string(),
});

/**
 * Rota de fumaça da IA. Caminho real: GET /ai/test (o rewrite da Vercel manda
 * tudo para a function e o Fastify roteia pela URL original — não há prefixo
 * /api nas rotas, apesar do arquivo viver em apps/api/api/index.ts).
 *
 * @Public(): permite checar a IA sem token (ex.: `curl …/ai/test`).
 */
@Controller('ai')
export class AiController {
  constructor(private readonly gemini: GeminiAdapter) {}

  @Public()
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
        modelo: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
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
}
