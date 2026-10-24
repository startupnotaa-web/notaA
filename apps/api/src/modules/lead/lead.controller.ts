import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { CriarLeadRequestSchema, type CriarLeadRequest, type CriarLeadResponse } from '@notaa/contracts';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LeadService } from './lead.service';

function primeiro(valor: string | string[] | undefined): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v?.trim() || null;
}

/**
 * Origem de rede de quem enviou. Na Vercel o cabeçalho `x-vercel-forwarded-for` é preenchido pela
 * plataforma e o cliente não o controla. Fora dela (dev, outro host) cai nos cabeçalhos de proxy, que um
 * cliente pode forjar: o limite de envios é uma proteção contra abuso casual, não uma barreira de segurança.
 */
function enderecoDeRede(req: FastifyRequest): string | null {
  const h = req.headers;
  return (
    primeiro(h['x-vercel-forwarded-for']) ??
    primeiro(h['x-real-ip']) ??
    primeiro(h['x-forwarded-for'])?.split(',')[0]?.trim() ??
    req.ip ??
    null
  );
}

// Formulários públicos da landing. Sem token (@Public): quem preenche ainda não tem conta.
@Controller('leads')
export class LeadController {
  constructor(private readonly leads: LeadService) {}

  @Public()
  @Post()
  @HttpCode(202)
  registrar(
    @Body(new ZodValidationPipe(CriarLeadRequestSchema)) dados: CriarLeadRequest,
    @Req() req: FastifyRequest,
  ): Promise<CriarLeadResponse> {
    return this.leads.registrar(dados, enderecoDeRede(req));
  }
}
